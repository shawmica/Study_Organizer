import unittest
import sys
from io import StringIO
import backend_test

# Capture stdout
old_stdout = sys.stdout
captured_output = StringIO()
sys.stdout = captured_output

# Run the tests
test_suite = unittest.defaultTestLoader.loadTestsFromModule(backend_test)
test_runner = unittest.TextTestRunner(verbosity=2)
result = test_runner.run(test_suite)

# Restore stdout
sys.stdout = old_stdout

# Print results
print(f"Tests run: {result.testsRun}")
print(f"Errors: {len(result.errors)}")
print(f"Failures: {len(result.failures)}")

if result.errors:
    print("\nERRORS:")
    for test, error in result.errors:
        print(f"{test}: {error}")

if result.failures:
    print("\nFAILURES:")
    for test, failure in result.failures:
        print(f"{test}: {failure}")

if not result.errors and not result.failures:
    print("\nAll tests PASSED!")
else:
    print("\nSome tests FAILED!")