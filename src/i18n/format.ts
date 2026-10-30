export function formatMessage(template: string, values: Readonly<Record<string, unknown>>): string {
  return template.replace(/\{\{([A-Za-z_$][A-Za-z0-9_$]*)\}\}/g, (marker, name: string) => {
    if (!Object.hasOwn(values, name)) throw new Error(`Missing translation placeholder: ${name}`);
    return String(values[name]);
  });
}
