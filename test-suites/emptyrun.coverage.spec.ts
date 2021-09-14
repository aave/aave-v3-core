import { makeSuite } from './helpers/make-suite';

/* Workaround to fix 0 coverage report issue */

makeSuite('Empty run for coverage', () => {});
