/**
 * The pure compliance core: combine (aggregate) and judge (validate), plus the
 * data shapes they work over. Nothing here imports NestJS, touches the
 * filesystem, the network, or HTTP. Everything is data in, data out.
 */
export * from './types';
export * from './aggregate/aggregate';
export * from './validate/validate';
export {
  equalsLenient,
  containsPhrase,
  normalizedText,
  words,
} from './text/normalize';
export { matchesDesignation } from './designations/match';
export { checkWarning, WarningVerdict } from './warning/warning';
