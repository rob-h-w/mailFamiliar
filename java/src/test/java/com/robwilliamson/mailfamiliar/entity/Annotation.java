package com.robwilliamson.mailfamiliar.entity;

import io.github.classgraph.*;
import org.assertj.core.api.AbstractBooleanAssert;
import org.junit.jupiter.api.Test;

import javax.persistence.*;
import java.util.*;
import java.util.stream.Collectors;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;

public class Annotation {

  @Test
  void hibernateUsedCorrectly() {
    try (ScanResult scanResult = new ClassGraph()
        .enableAllInfo()
        .scan()) {
      for (ClassInfo classInfo :
          scanResult.getClassesWithAnnotation(Table.class.getName())) {
        assertTrue(Table.class, classInfo, Entity.class);
        checkEntityClass(classInfo);
      }

      for (ClassInfo classInfo : scanResult.getClassesWithAnnotation(Entity.class.getName())) {
        assertTrue(Entity.class, classInfo, Table.class);
      }
    }
  }

  private <T extends java.lang.annotation.Annotation, U extends java.lang.annotation.Annotation>
  AbstractBooleanAssert<?> abstractAnnotationAssert(
      Class<U> annotationClazz,
      ClassInfo classInfo,
      Class<T> clazz,
      boolean check) {
    return assertThat(classInfo.hasAnnotation(clazz.getName()))
        .withFailMessage(
            annotationClazz.getName()
                + " annotated classes like " + classInfo.getName()
                + " must " + (check ? "" : "not ")
                + "be annotated with " + clazz.getName());
  }

  private <T extends java.lang.annotation.Annotation, U extends java.lang.annotation.Annotation>
  void assertTrue(
      Class<U> annotationClazz,
      ClassInfo classInfo,
      Class<T> clazz) {
    abstractAnnotationAssert(annotationClazz, classInfo, clazz, true).isTrue();
  }

  private <T extends java.lang.annotation.Annotation, U extends java.lang.annotation.Annotation>
  void assertFalse(
      Class<U> annotationClazz,
      ClassInfo classInfo,
      Class<T> clazz) {
    abstractAnnotationAssert(annotationClazz, classInfo, clazz, false).isFalse();
  }

  private void checkEntityClass(ClassInfo classInfo) {
    checkEntitySetters(classInfo);
    checkEntityGetters(classInfo);
    checkEntityClassConstructor(classInfo);
    checkEntityToString(classInfo);
    checkEntityEquals(classInfo);
    checkEntityHashCode(classInfo);
  }

  private void checkEntityHashCode(ClassInfo classInfo) {
    assertDefinesMethod(classInfo, "hashCode", 0, "int");
  }

  private void checkEntityEquals(ClassInfo classInfo) {
    assertDefinesMethod(classInfo, "equals", 1, "boolean");
  }

  private void checkEntityToString(ClassInfo classInfo) {
    assertDefinesMethod(classInfo, "toString", 0);
  }

  private MethodInfo assertDefinesMethod(ClassInfo classInfo, String methodName, int parameterCount) {
    final List<MethodInfo> methods = classInfo.getDeclaredMethodInfo(methodName)
        .stream()
        .filter(methodInfo -> methodInfo.getParameterInfo().length == parameterCount)
        .collect(Collectors.toList());
    assertThat(methods.size())
        .withFailMessage(
            classInfo.getName() + " must define a "
                + methodName + " method")
        .isEqualTo(1);
    return methods.get(0);
  }

  private MethodInfo assertDefinesMethod(
      ClassInfo classInfo,
      String methodName,
      int parameterCount,
      String returnType) {
    final MethodInfo methodInfo = assertDefinesMethod(classInfo, methodName, parameterCount);
    assertThat(methodInfo.getTypeDescriptor()).isInstanceOf(MethodTypeSignature.class);
    final MethodTypeSignature methodTypeSignature = methodInfo.getTypeDescriptor();
    assertThat(methodTypeSignature.getResultType().toString())
        .withFailMessage(
            classInfo.getName() + "." + methodName + " must return" + returnType)
        .isEqualTo(returnType);
    return methodInfo;
  }

  private void checkEntityGetters(ClassInfo classInfo) {
    getFields(classInfo)
        .forEach(fieldInfo -> {
          final String fieldName = fieldInfo.getName();
          final String fieldType = fieldInfo.getTypeDescriptor().toString();
          final String getterName =
              (fieldType.equals("boolean") ? "is" : "get")
                  + fieldName.substring(0, 1).toUpperCase() + fieldName.substring(1);
          assertDefinesMethod(
              classInfo,
              getterName,
              0,
              fieldType);
        });
  }

  private void checkEntitySetters(ClassInfo classInfo) {
    getFields(classInfo)
        .forEach(fieldInfo -> {
          final String fieldName = fieldInfo.getName();
          final String setterName =
              "set" + fieldName.substring(0, 1).toUpperCase() + fieldName.substring(1);
          assertDefinesMethod(
              classInfo,
              setterName,
              1,
              "void");
        });
  }

  private List<FieldInfo> getFields(ClassInfo classInfo) {
    return classInfo.getDeclaredFieldInfo()
        .stream()
        .filter(fieldInfo -> !fieldInfo.isStatic() && !fieldInfo.isTransient())
        .collect(Collectors.toList());
  }

  private void checkEntityClassConstructor(ClassInfo classInfo) {
    final MethodInfoList constructorInfo = classInfo.getConstructorInfo();
    assertThat(constructorInfo.size())
        .withFailMessage(
            "At least no arg and all args constructors must be present in"
                + classInfo.getName())
        .isGreaterThanOrEqualTo(2);
    assertThat(
        constructorInfo
            .stream()
            .anyMatch(methodInfo -> methodInfo.getParameterInfo().length == 0))
        .withFailMessage(
            "No arg constructor required for "
                + classInfo.getName())
        .isTrue();

    final List<FieldInfo> fieldInfos = getFields(classInfo);
    final Map<TypeSignature, List<FieldInfo>> fieldsByTypeSignature = fieldInfos
        .stream()
        .collect(Collectors.groupingBy(FieldInfo::getTypeDescriptor));
    assertThat(
        constructorInfo
            .stream()
            .anyMatch(methodInfo -> {
              final List<MethodParameterInfo> parameterInfos =
                  Arrays.asList(methodInfo.getParameterInfo());
              if (methodInfo.getParameterInfo().length != fieldInfos.size()) {
                return false;
              }

              final Map<TypeSignature, List<MethodParameterInfo>> parametersByTypeSignature =
                  parameterInfos
                      .stream()
                      .collect(Collectors.groupingBy(MethodParameterInfo::getTypeDescriptor));
              if (!parametersByTypeSignature.keySet().containsAll(fieldsByTypeSignature.keySet())) {
                return false;
              }

              for (TypeSignature typeSignature : parametersByTypeSignature.keySet()) {
                if (parametersByTypeSignature.get(typeSignature).size() != fieldsByTypeSignature.get(typeSignature).size()) {
                  return false;
                }
              }

              return true;
            }))
        .withFailMessage(
            "All args constructor required for "
                + classInfo.getName())
        .isTrue();
  }
}
