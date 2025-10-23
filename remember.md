# Memory: Testing Requirements

## Always Test Before Publishing

Before publishing any version, I must run comprehensive tests to verify that all fixes are working correctly:

### Required Test Suite:
1. **Jest Tests**: `npm run test:jest` - Unit and integration tests
2. **Regression Tests**: `npm run test:regression` - Prevents future breakage
3. **Full Test Suite**: `npm run test:run` - All Node.js tests
4. **Specific Functionality Tests**: Test the specific fixes being published

### Test Coverage Must Include:
- ✅ **fetchOne uid parameter fix** (regression test)
- ✅ **EmailSetFlags error handling improvements**
- ✅ **Both Alimail and Gmail providers**
- ✅ **Core n8n node functionality**
- ✅ **Search and email retrieval operations**

### Test Results Must Show:
- All tests passing (100% success rate)
- No regressions introduced
- Both providers working correctly
- Specific fixes validated

### Memory Note:
Never publish without running and verifying all tests pass. The user expects comprehensive testing before any release.
