#!/bin/bash

# IMAP Enhanced Node Test Runner
# This script runs the complete test suite with proper configuration

set -e  # Exit on any error

echo "🧪 IMAP Enhanced Node Test Suite"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if tests directory exists
if [ ! -d "tests" ]; then
    print_error "tests directory not found. Please ensure tests are set up."
    exit 1
fi

# Install dependencies if needed
print_status "Checking dependencies..."
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Install test dependencies if needed
if [ ! -d "tests/node_modules" ]; then
    print_status "Installing test dependencies..."
    cd tests
    npm install
    cd ..
fi

# Run different types of tests based on arguments
case "${1:-all}" in
    "unit")
        print_status "Running unit tests..."
        npm run test:unit
        ;;
    "integration")
        print_status "Running integration tests..."
        npm run test:integration
        ;;
    "coverage")
        print_status "Running tests with coverage..."
        npm run test:coverage
        ;;
    "watch")
        print_status "Running tests in watch mode..."
        npm run test:watch
        ;;
    "ci")
        print_status "Running tests for CI..."
        npm run test:ci
        ;;
    "debug")
        print_status "Running tests in debug mode..."
        npm run test:debug
        ;;
    "all"|*)
        print_status "Running all tests..."
        npm test
        ;;
esac

# Check if tests passed
if [ $? -eq 0 ]; then
    print_success "All tests passed! ✅"

    # Show coverage if available
    if [ -f "tests/coverage/lcov-report/index.html" ]; then
        print_status "Coverage report available at: tests/coverage/lcov-report/index.html"
    fi

    # Show test results if available
    if [ -f "tests/test-results/summary.json" ]; then
        print_status "Test results available at: tests/test-results/"
    fi
else
    print_error "Some tests failed! ❌"
    exit 1
fi

print_success "Test suite completed successfully! 🎉"
