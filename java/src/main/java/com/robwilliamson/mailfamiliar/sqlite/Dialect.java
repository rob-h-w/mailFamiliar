package com.robwilliamson.mailfamiliar.sqlite;

import java.sql.Types;

public class Dialect extends org.hibernate.dialect.Dialect {
  public Dialect() {
    registerColumnType(Types.BIT, "integer");
    registerColumnType(Types.TINYINT, "tinyint");
    registerColumnType(Types.SMALLINT, "smallint");
    registerColumnType(Types.INTEGER, "integer");
    registerColumnType(Types.BIGINT, "bigint");
    registerColumnType(Types.FLOAT, "float");
    registerColumnType(Types.REAL, "real");
    registerColumnType(Types.DOUBLE, "double");
    registerColumnType(Types.NUMERIC, "numeric");
    registerColumnType(Types.DECIMAL, "decimal");
    registerColumnType(Types.CHAR, "char");
    registerColumnType(Types.VARCHAR, "varchar");
    registerColumnType(Types.LONGVARCHAR, "longvarchar");
    registerColumnType(Types.DATE, "date");
    registerColumnType(Types.TIME, "time");
    registerColumnType(Types.TIMESTAMP, "timestamp");
    registerColumnType(Types.BINARY, "blob");
    registerColumnType(Types.VARBINARY, "blob");
    registerColumnType(Types.LONGVARBINARY, "blob");
    registerColumnType(Types.BLOB, "blob");
    registerColumnType(Types.CLOB, "clob");
    registerColumnType(Types.BOOLEAN, "integer");
  }

  @Override
  public org.hibernate.dialect.identity.IdentityColumnSupport getIdentityColumnSupport() {
    return new IdentityColumnSupport();
  }

  @Override
  public boolean hasAlterTable() {
    return false;
  }

  @Override
  public boolean dropConstraints() {
    return false;
  }

  @Override
  public String getDropForeignKeyString() {
    return "";
  }

  @Override
  public String getAddForeignKeyConstraintString(String constraintName,
                                                 String[] foreignKey,
                                                 String referencedTable,
                                                 String[] primaryKey,
                                                 boolean referencesPrimaryKey) {
    return "";
  }

  @Override
  public String getAddForeignKeyConstraintString(String constraintName,
                                                 String foreignKeyDefinition) {
    return "";
  }

  public String getAddPrimaryKeyConstraintString(String constraintName) {
    return "";
  }

  public String getForUpdateString() {
    return "";
  }

  public String getAddColumnString() {
    return "add column";
  }

  public boolean supportsOuterJoinForUpdate() {
    return false;
  }

  public boolean supportsIfExistsBeforeTableName() {
    return true;
  }

  public boolean supportsCascadeDelete() {
    return false;
  }
}
