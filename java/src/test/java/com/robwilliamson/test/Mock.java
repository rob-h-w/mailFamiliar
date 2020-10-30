package com.robwilliamson.test;

import org.aspectj.util.Reflection;
import org.mockito.MockingDetails;
import org.mockito.exceptions.misusing.*;

import java.lang.reflect.Method;

import static org.mockito.Mockito.mockingDetails;

public class Mock {
  private Mock() {
  }

  public static int countInvocations(
      Object callee,
      String methodName,
      Object[] arguments) {
    if (callee == null) {
      throw new NullInsteadOfMockException("callee is null.");
    }
    final MockingDetails mockingDetails = mockingDetails(callee);
    if (!mockingDetails.isMock()) {
      throw new NotAMockException("callee is not a mock.");
    }
    final Method method = Reflection
        .getMatchingMethod(
            callee.getClass().getSuperclass(),
            methodName,
            arguments);
    assert method != null;
    return (int) mockingDetails.getInvocations()
        .stream()
        .filter(invocation -> method.equals(invocation.getMethod()))
        .count();
  }
}
