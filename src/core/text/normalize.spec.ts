import {
  containsPhrase,
  equalsLenient,
  normalizedText,
  words,
} from './normalize';

describe('words', () => {
  it('lowercases and drops punctuation', () => {
    expect(words("STONE'S THROW")).toEqual(['stone', 's', 'throw']);
  });
});

describe('normalizedText', () => {
  it('makes case and punctuation differences equal', () => {
    expect(normalizedText("STONE'S THROW")).toBe(
      normalizedText("Stone's Throw"),
    );
  });
});

describe('equalsLenient', () => {
  it('ignores case and punctuation', () => {
    expect(equalsLenient('45% Alc./Vol.', '45% ALC/VOL')).toBe(true);
    expect(equalsLenient('45%', '40%')).toBe(false);
  });
});

describe('containsPhrase', () => {
  it('finds a contiguous run of words', () => {
    expect(
      containsPhrase(
        'Bottled by Old Tom Distillery, Bardstown, KY',
        'Old Tom Distillery, Bardstown, KY',
      ),
    ).toBe(true);
  });

  it('is word-based, not substring-based', () => {
    // "gin" must not match inside "imagine"; "rum" must not match "spectrum".
    expect(containsPhrase('Imagine Fine Spirits', 'gin')).toBe(false);
    expect(containsPhrase('Broad Spectrum Vodka', 'rum')).toBe(false);
  });

  it('requires the words in order', () => {
    expect(containsPhrase('Distillery Old Tom', 'Old Tom Distillery')).toBe(
      false,
    );
  });
});
