#!/bin/bash
# Build script for arcpaykit Python package

set -e

echo "Building arcpaykit Python package..."

# Clean previous builds
echo "Cleaning previous builds..."
rm -rf build/ dist/ *.egg-info

# Build the package
echo "Building package..."
python -m build

echo "✓ Build complete!"
echo "Distribution files created in dist/ directory:"
ls -lh dist/

echo ""
echo "To install locally: pip install dist/arcpaykit-*.whl"
echo "To test: python test_arcpaykit.py"

