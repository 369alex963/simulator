from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.accounts.permissions import IsAdminLevel
from .models import Branch
from .serializers import BranchCreateSerializer, BranchSerializer


@api_view(["GET", "POST"])
@permission_classes([IsAdminLevel])
def branch_list(request):
    if request.method == "GET":
        branches = Branch.objects.all()
        return Response(BranchSerializer(branches, many=True).data)

    # POST — create branch (admin/admin_user only)
    serializer = BranchCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    branch = serializer.save()
    return Response(BranchSerializer(branch).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAdminLevel])
def branch_detail(request, pk):
    try:
        branch = Branch.objects.get(pk=pk)
    except Branch.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(BranchSerializer(branch).data)

    if request.method == "PATCH":
        if branch.is_hq:
            return Response(
                {"detail": "Cannot rename or deactivate the HQ branch."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = BranchSerializer(branch, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    # DELETE
    if branch.is_hq:
        return Response(
            {"detail": "Cannot delete the HQ branch."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if branch.users.filter(is_active=True).exists():
        return Response(
            {"detail": "Deactivate or reassign all users in this branch before deleting."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    branch.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
