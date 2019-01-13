type JsonValue = IJsonArray | IJsonObject | string | number | null;

interface IJsonArray {
  firstOrDefault(predicate: (item: JsonValue) => boolean): JsonValue;
  where(predicate: (item: JsonValue) => boolean): JsonValue[];
  orderBy(propertyExpression: (item: JsonValue) => any): JsonValue[];
  orderByDescending(propertyExpression: (item: JsonValue) => any): JsonValue[];
  orderByMany(propertyExpressions: [(item: JsonValue) => any]): JsonValue[];
  orderByManyDescending(propertyExpressions: [(item: JsonValue) => any]): JsonValue[];
  remove(item: JsonValue): boolean;
  add(item: JsonValue): void;
  addRange(items: JsonValue[]): void;
  removeRange(items: JsonValue[]): void;
}

export default interface IJsonObject {
  [key: string]: JsonValue;
}
