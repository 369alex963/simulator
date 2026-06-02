"""Brand-kit resolution endpoint + CRUD for admin."""
from django.core.cache import cache
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import IsAdminLevel
from .geo import get_country_from_request
from .models import BrandKit
from .serializers import BrandKitCreateSerializer, BrandKitListSerializer, BrandKitSerializer, PublicBrandKitSerializer

_BRAND_KIT_CACHE_TTL = 60  # seconds


def _resolve_kit_db(country: str) -> "BrandKit | None":
    """DB-level country lookup — no Python-side table scan."""
    if country:
        kit = BrandKit.objects.filter(
            country_codes__icontains=country.upper()
        ).first()
        if kit:
            return kit
    # Default kit
    try:
        return BrandKit.objects.get(is_default=True)
    except BrandKit.DoesNotExist:
        return BrandKit.objects.first() or BrandKit()


def _resolve_kit(request) -> BrandKit:
    """
    Resolve the active brand-kit for this request using the priority chain:
    1. Authenticated user's branch kit
    2. IP-detected country kit
    3. 30-day country cookie
    4. Default kit
    """
    # 1. Logged-in user → branch kit (always fresh, no caching needed)
    if request.user.is_authenticated:
        branch = getattr(request.user, "branch", None)
        if branch and hasattr(branch, "brand_kit") and branch.brand_kit_id:
            return branch.brand_kit

    # 2. IP country / cookie
    country = get_country_from_request(request) or request.COOKIES.get("kernelios_country", "")
    country = country.upper()[:2] if country else ""

    cache_key = f"brand_kit_country_{country}" if country else "brand_kit_default"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    kit = _resolve_kit_db(country)
    cache.set(cache_key, kit, timeout=_BRAND_KIT_CACHE_TTL)
    return kit


@api_view(["GET"])
@permission_classes([AllowAny])
def brand_resolve(request):
    """
    GET /api/brand/resolve/
    Returns the resolved brand-kit CSS variables + metadata for this request.
    Called by the frontend BrandKitProvider on every page load.
    """
    kit = _resolve_kit(request)
    # Use public serializer — never exposes SMTP/Moodle credentials to unauthenticated callers
    serializer = PublicBrandKitSerializer(kit, context={"request": request})
    data = serializer.data

    response = Response(data)

    # Set / refresh 30-day country cookie from IP detection
    country = get_country_from_request(request)
    if country:
        response.set_cookie(
            "kernelios_country",
            country[:2],
            max_age=60 * 60 * 24 * 30,
            httponly=False,
            samesite="Lax",
        )

    return response


@api_view(["GET", "POST"])
@permission_classes([IsAdminLevel])
def brand_kit_list(request):
    if request.method == "GET":
        kits = BrandKit.objects.all()
        return Response(BrandKitListSerializer(kits, many=True, context={"request": request}).data)

    # POST — create brand-kit
    serializer = BrandKitCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    with transaction.atomic():
        if serializer.validated_data.get("is_default"):
            BrandKit.objects.filter(is_default=True).update(is_default=False)
        kit = serializer.save(created_by=request.user)
    return Response(BrandKitSerializer(kit, context={"request": request}).data,
                    status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAdminLevel])
def brand_kit_detail(request, pk):
    try:
        kit = BrandKit.objects.get(pk=pk)
    except BrandKit.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(BrandKitSerializer(kit, context={"request": request}).data)

    if request.method == "PATCH":
        serializer = BrandKitCreateSerializer(kit, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            if serializer.validated_data.get("is_default"):
                BrandKit.objects.filter(is_default=True).exclude(pk=pk).update(is_default=False)
            serializer.save()
        return Response(BrandKitSerializer(kit, context={"request": request}).data)

    # DELETE
    if kit.is_default:
        return Response(
            {"detail": "Cannot delete the default brand-kit."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    kit.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


UPLOAD_FIELD_MAP = {
    "logo":          "logo_file",
    "footer_logo":   "footer_logo_file",
    "favicon":       "favicon_file",
    "email_header_logo": "email_header_logo_file",
}


@api_view(["POST"])
@permission_classes([IsAdminLevel])
@parser_classes([MultiPartParser, FormParser])
def brand_kit_upload_logo(request, pk):
    """
    Upload an asset for a brand-kit.
    Body: multipart with file field name = one of:
      logo, footer_logo, favicon, email_header_logo
    """
    try:
        kit = BrandKit.objects.get(pk=pk)
    except BrandKit.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    uploaded = None
    field = None
    for key, model_field in UPLOAD_FIELD_MAP.items():
        if key in request.FILES:
            uploaded = request.FILES[key]
            field = model_field
            break

    if not uploaded or not field:
        return Response(
            {"detail": f"No file. Use one of: {', '.join(UPLOAD_FIELD_MAP.keys())}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate file type and size
    ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg", "image/webp", "image/x-icon", "image/gif"}
    ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".ico", ".gif"}
    MAX_SIZE_BYTES = 2 * 1024 * 1024  # 2 MB

    import os
    ext = os.path.splitext(uploaded.name)[1].lower()
    if uploaded.content_type not in ALLOWED_CONTENT_TYPES or ext not in ALLOWED_EXTENSIONS:
        return Response(
            {"detail": "Invalid file type. Allowed: PNG, JPEG, WebP, ICO, GIF."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if uploaded.size > MAX_SIZE_BYTES:
        return Response(
            {"detail": "File too large. Maximum size is 2 MB."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    setattr(kit, field, uploaded)
    kit.save(update_fields=[field])
    return Response({
        "field": field,
        "url": request.build_absolute_uri(getattr(kit, field).url),
    })


@api_view(["POST"])
@permission_classes([IsAdminLevel])
def brand_kit_set_default(request, pk):
    """POST /api/brand/kits/<id>/set-default/ — make this kit the site-wide default."""
    try:
        kit = BrandKit.objects.get(pk=pk)
    except BrandKit.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    with transaction.atomic():
        BrandKit.objects.filter(is_default=True).update(is_default=False)
        kit.is_default = True
        kit.save(update_fields=["is_default"])

    return Response({"detail": f"'{kit.name}' is now the default brand-kit."})


@api_view(["POST"])
@permission_classes([IsAdminLevel])
def brand_kit_attach(request, pk):
    """Attach this brand-kit to a branch."""
    from apps.branches.models import Branch

    try:
        kit = BrandKit.objects.get(pk=pk)
    except BrandKit.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    branch_id = request.data.get("branch_id")
    if not branch_id:
        return Response({"detail": "branch_id required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        branch = Branch.objects.get(pk=branch_id)
    except Branch.DoesNotExist:
        return Response({"detail": "Branch not found."}, status=status.HTTP_404_NOT_FOUND)

    branch.brand_kit = kit
    branch.save(update_fields=["brand_kit"])
    return Response({"detail": f"Brand-kit '{kit.name}' attached to branch '{branch.name}'."})
