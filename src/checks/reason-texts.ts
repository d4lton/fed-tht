/**
 * Turns the result's short reason codes into readable sentences for whatever
 * shows a result. Wording lives here, out of the core (which carries only codes
 * and facts) — so it is easy to change and could be translated. Served by
 * {@link ReasonTextsController}.
 */
export const REASON_TEXTS: Record<string, string> = {
  "brand-missing": "No brand name was found on any label.",
  "brand-wrong": "The brand on the label doesn't match the application.",
  "brand-conflict": "Two labels show different brand names.",
  "name-address-missing": "No producer name and address was found on any label.",
  "name-address-wrong": "The producer name and address on the label doesn't match the application.",
  "name-address-conflict": "Two labels show a different producer name and address.",
  "warning-missing": "The government warning is missing.",
  "warning-wrong": "The government warning wording is not exactly correct.",
  "warning-caps": "\"GOVERNMENT WARNING\" is not in capital letters.",
  "warning-unreadable": "The government warning could not be read.",
  "warning-conflict": "Two labels show a different government warning.",
  "alcohol-missing": "No alcohol content statement was found.",
  "alcohol-conflict": "Two labels show a different alcohol content.",
  "net-contents-missing": "No net contents statement was found.",
  "net-contents-conflict": "Two labels show a different net contents.",
  "class-type-missing": "No class/type designation was found.",
  "class-type-invalid": "The class/type is not a recognized legal designation.",
  "class-type-unconfirmed": "The class/type is a specialty designation that needs a person to confirm.",
  "class-type-conflict": "Two labels show a different class/type designation.",
  "country-of-origin-missing": "An imported product must show a country of origin, and none was found.",
  "country-of-origin-conflict": "Two labels show a different country of origin."
};
