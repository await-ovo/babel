import type { Formatter } from "./formatters";
import type { TemplateReplacements, TemplateOpts } from "./options";
import { normalizeReplacements } from "./options";
import parseAndBuildMetadata from "./parse";
import populatePlaceholders from "./populate";

export default function literalTemplate<T>(
  formatter: Formatter<T>,
  tpl: Array<string>,
  opts: TemplateOpts,
): (_: Array<unknown>) => (_: unknown) => T {
  const { metadata, names } = buildLiteralData(formatter, tpl, opts);

  return arg => {
    const defaultReplacements: TemplateReplacements = {};
    arg.forEach((replacement, i) => {
      defaultReplacements[names[i]] = replacement;
    });

    return (arg: unknown) => {
      const replacements = normalizeReplacements(arg);

      if (replacements) {
        Object.keys(replacements).forEach(key => {
          if (Object.prototype.hasOwnProperty.call(defaultReplacements, key)) {
            throw new Error("Unexpected replacement overlap.");
          }
        });
      }

      return formatter.unwrap(
        populatePlaceholders(
          metadata,
          replacements
            ? Object.assign(replacements, defaultReplacements)
            : defaultReplacements,
        ),
      );
    };
  };
}

function buildLiteralData<T>(
  formatter: Formatter<T>,
  tpl: Array<string>,
  opts: TemplateOpts,
) {
  let names;
  let nameSet: Set<string>;
  let metadata;
  let prefix = "";
  let existingDuplicatedWithNames = false;

  do {
    // If there are cases where the template already contains $0 or any other
    // matching pattern, we keep adding "$" characters until a unique prefix
    // is found.
    prefix += "$";
    const result = buildTemplateCode(tpl, prefix);

    names = result.names;
    existingDuplicatedWithNames = result.existingDuplicatedWithNames;
    nameSet = new Set(names);
    metadata = parseAndBuildMetadata(formatter, formatter.code(result.code), {
      parser: opts.parser,

      // Explicitly include our generated names in the whitelist so users never
      // have to think about whether their placeholder pattern will match.
      placeholderWhitelist: new Set(
        result.names.concat(
          opts.placeholderWhitelist
            ? Array.from(opts.placeholderWhitelist)
            : [],
        ),
      ),
      placeholderPattern: opts.placeholderPattern,
      preserveComments: opts.preserveComments,
      syntacticPlaceholders: opts.syntacticPlaceholders,
    });
  } while (
    metadata.placeholders.some(
      placeholder =>
        existingDuplicatedWithNames &&
        placeholder.isDuplicate &&
        nameSet.has(placeholder.name),
    )
  );

  return { metadata, names };
}

function buildTemplateCode(
  tpl: Array<string>,
  prefix: string,
): {
  names: Array<string>;
  code: string;
  existingDuplicatedWithNames: boolean;
} {
  const names = [];
  const rawCode = tpl.join();

  let code = tpl[0];
  let existingDuplicatedWithNames = false;

  for (let i = 1; i < tpl.length; i++) {
    const value = `${prefix}${i - 1}`;
    names.push(value);
    if (!existingDuplicatedWithNames) {
      existingDuplicatedWithNames = rawCode.includes(value);
    }

    code += value + tpl[i];
  }

  return { names, code, existingDuplicatedWithNames };
}
