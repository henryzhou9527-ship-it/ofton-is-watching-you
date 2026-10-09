"""Preserve Python and dependency license files in standalone distributions."""
import importlib.metadata
from pathlib import Path
import shutil
import sys


def collect(output):
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    packages = ['requests', 'psutil', 'pystray', 'Pillow', 'pyinstaller', 'certifi', 'urllib3', 'charset-normalizer', 'idna', 'altgraph', 'packaging']
    for package in packages:
        distribution = importlib.metadata.distribution(package)
        for entry in distribution.files or []:
            if not any(part.lower().startswith(('license', 'copying', 'notice')) for part in entry.parts):
                continue
            source = Path(distribution.locate_file(entry))
            if not source.is_file():
                continue
            relative = Path(*[part for part in entry.parts if part not in ('.', '..')])
            target = output / package / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
    python_license = Path(sys.base_prefix) / 'LICENSE.txt'
    if python_license.is_file():
        shutil.copyfile(python_license, output / 'PYTHON-LICENSE.txt')


if __name__ == '__main__':
    collect(sys.argv[1])
