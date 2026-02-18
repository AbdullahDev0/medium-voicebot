/**
 * @file time.ts
 * @description Time formatting utilities.
 * @module utils/time
 *

 */

import { TIME_FORMAT } from '../constants';

const formatter = new Intl.DateTimeFormat(TIME_FORMAT.LOCALE, TIME_FORMAT.OPTIONS);

export const formatTime = (date: Date) => formatter.format(date);
