#!/usr/bin/env python
"""KERNELiOS — Django management entry point."""
import os
import sys


def main() -> None:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "kernelios.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Activate the venv "
            "(`.venv\\Scripts\\activate`) and `pip install -r requirements.txt` first."
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
