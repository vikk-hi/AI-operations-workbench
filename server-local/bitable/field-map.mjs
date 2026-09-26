export class FieldMappingError extends Error {
  constructor(sourceAlias, fieldName, detail) {
    super(`[${sourceAlias}] field "${fieldName}" ${detail}`);
    this.name = 'FieldMappingError';
    this.sourceAlias = sourceAlias;
    this.fieldName = fieldName;
  }
}

const unique = (items) => [...new Set(items.filter(Boolean))];

export function createFieldReader(fieldDefinitions, options = {}) {
  const sourceAlias = options.sourceAlias || 'Bitable';
  const byName = new Map(fieldDefinitions.map((field) => [field.field_name, field]));

  const requireField = (fieldName, acceptedTypes) => {
    const definition = byName.get(fieldName);
    if (!definition) throw new FieldMappingError(sourceAlias, fieldName, 'is missing');
    if (!acceptedTypes.includes(definition.type)) {
      throw new FieldMappingError(sourceAlias, fieldName, `has incompatible type ${definition.type}`);
    }
    return definition;
  };

  const value = (recordFields, fieldName, acceptedTypes, emptyValue = null) => {
    requireField(fieldName, acceptedTypes);
    const current = recordFields?.[fieldName];
    return current == null || current === '' ? emptyValue : current;
  };

  return Object.freeze({
    requireField,
    text(recordFields, fieldName) {
      const current = value(recordFields, fieldName, [1]);
      if (current == null) return null;
      if (typeof current === 'string') return current;
      if (Array.isArray(current)) {
        const text = current.map((item) => typeof item === 'string' ? item : item?.text ?? item?.name).filter(Boolean).join('');
        return text || null;
      }
      return String(current);
    },
    number(recordFields, fieldName) {
      const current = value(recordFields, fieldName, [2]);
      if (current == null) return null;
      const numeric = Number(current);
      return Number.isFinite(numeric) ? numeric : null;
    },
    date(recordFields, fieldName) {
      const current = value(recordFields, fieldName, [5]);
      if (current == null) return null;
      if (typeof current === 'string' && /^\d{4}-\d{2}-\d{2}/.test(current)) return current.slice(0, 10);
      const date = new Date(Number(current));
      return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
    },
    boolean(recordFields, fieldName) {
      const current = value(recordFields, fieldName, [7]);
      return current == null ? null : Boolean(current);
    },
    personIds(recordFields, fieldName) {
      const current = value(recordFields, fieldName, [11], []);
      if (!Array.isArray(current)) return [];
      return unique(current.map((person) => typeof person === 'string' ? person : person?.id ?? person?.open_id ?? person?.user_id));
    },
    linkedRecordIds(recordFields, fieldName) {
      const current = value(recordFields, fieldName, [18, 21], []);
      if (!Array.isArray(current)) return [];
      return unique(current.map((record) => typeof record === 'string' ? record : record?.record_id ?? record?.id));
    },
  });
}
