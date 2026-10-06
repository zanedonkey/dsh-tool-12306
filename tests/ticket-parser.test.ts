import { describe, expect, it } from 'vitest';
import fixture from './fixtures/tickets.json' with { type: 'json' };
import { decodeTickets } from '../src/client/validation.js';
import { parseTickets, parseSeat, parsePrices } from '../src/parser/ticket.js';
describe('Ticket Parser (fixed synthetic fixtures)', () => {
  it('parses fields, available count and packed prices', () => {
    const [train] = parseTickets(decodeTickets(fixture), '2026-10-07');
    expect(train?.trainCode).toBe('G1'); expect(train?.durationMinutes).toBe(272);
    expect(train?.fromStation).toBe('北京南'); expect(train?.toStation).toBe('上海虹桥');
    expect(train?.seats.secondClass).toEqual({ available: true, count: 21, price: 553, status: 'available' });
    expect(train?.seats.firstClass.count).toBeNull(); expect(train?.seats.firstClass.price).toBe(933);
    expect(train?.seats.business.price).toBe(1748);
  });
  it('uses passenger date rather than train origin date and handles midnight', () => {
    const trains = parseTickets(decodeTickets(fixture), '2026-10-07');
    expect(trains[0]?.departureDate).toBe('2026-10-07');
    expect(trains[1]?.arrivalDate).toBe('2026-10-08');
    expect(trains[1]?.seats.secondClass.status).toBe('waitlist');
  });
  it.each(['有','充足'])('does not invent numeric counts for %s', raw => {
    expect(parseSeat(raw)).toMatchObject({ available: true, count: null, price: null });
  });
  it.each(['0','无','候补','--',''])('does not treat %s as available', raw => expect(parseSeat(raw).available).toBe(false));
  it('preserves unknown availability and malformed/conflicting prices as null', () => {
    expect(parseSeat('未知').available).toBeNull(); expect(parseSeat(undefined).count).toBeNull();
    expect(parsePrices('O0553')).toEqual({}); expect(parsePrices('O055300021O050000020').secondClass).toBeNull();
  });
  it('rejects upstream shape changes explicitly', () => {
    expect(() => decodeTickets({ data: { result: [], map: null } })).toThrow('响应对象格式');
    expect(() => parseTickets({ data: { result: ['a|b'], map: {} } }, '2026-10-07')).toThrow('字段不足');
  });
});

