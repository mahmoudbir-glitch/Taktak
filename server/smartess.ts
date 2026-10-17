/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SmartESS (DessMonitor) cloud client — server side only.
 *
 * The SmartESS phone app and web.dessmonitor.com share one backend. Every
 * request is a signed GET to /public/:
 *   login:  sign = SHA1(salt + SHA1(password) + "&" + query)
 *   others: sign = SHA1(salt + secret + token + "&" + query)
 * Signing approach adapted from saimcyber/solarwatch and
 * Antoxa1081/smart-ess-api-gateway (both MIT).
 */

import crypto from 'node:crypto';
import querystring from 'node:querystring';

const BASE_URL = 'https://web.dessmonitor.com/public/';
/** Company key used by the SmartESS app for storage (ESS) accounts. */
export const SMARTESS_COMPANY_KEY = 'bnrl_frRFjEz8Mkn';

export interface SmartessAuth {
  token: string;
  secret: string;
  /** epoch ms after which the token should be renewed */
  expiresAt: number;
}

export interface SmartessDevice {
  name: string;
  pn: string;
  sn: string;
  devcode: string;
  devaddr: string;
  status: number;
  statusLabel: string;
}

/** Normalised live reading. Powers are in watts; null = not reported by this inverter. */
export interface SmartessSnapshot {
  deviceName: string;
  online: boolean;
  updatedAt: string | null;
  pvPowerW: number | null;
  pvVoltage: number | null;
  pvCurrent: number | null;
  batterySoc: number | null;
  batteryVoltage: number | null;
  batteryPowerW: number | null;
  batteryCurrentA: number | null;
  loadPowerW: number | null;
  loadPercent: number | null;
  gridVoltage: number | null;
  gridFrequency: number | null;
  gridConnected: boolean | null;
  inverterTemp: number | null;
  ratedPowerW: number | null;
  energyTodayKwh: number | null;
  workingState: string | null;
  faulted: boolean;
  /** Every parameter the inverter reported, for mapping new models */
  raw: { id: string; name?: string; val: string; unit?: string }[];
}

export class SmartessError extends Error {
  readonly code?: number | string;

  constructor(message: string, code?: number | string) {
    super(message);
    this.code = code;
    this.name = 'SmartessError';
  }
}

// ── signing ────────────────────────────────────────────────────────────────

const sha1 = (data: string) => crypto.createHash('sha1').update(data).digest('hex');

type Params = Record<string, string | number | undefined>;

/** Query encoding the DessMonitor backend expects inside the signature. */
export function transferUriStr(params: Params): string {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
  ) as Record<string, string | number>;
  return querystring
    .stringify(clean)
    .replace(/%20/g, '+')
    .replace(/%2B/g, '+')
    .replace(/%3A/g, ':')
    .replace(/%2C/g, ',')
    .replace(/%40/g, '@')
    .replace(/%24/g, '$')
    .replace(/%26/g, '&')
    .replace(/%3D/g, '=')
    .replace(/%28/g, '(')
    .replace(/%29/g, ')');
}

export function buildAuthSign(salt: string, password: string, params: Params): string {
  return sha1(`${salt}${sha1(password)}&${transferUriStr(params)}`);
}

export function buildSign(salt: string, auth: Pick<SmartessAuth, 'secret' | 'token'>, params: Params): string {
  return sha1(`${salt}${auth.secret}${auth.token}&${transferUriStr(params)}`);
}

// ── transport ──────────────────────────────────────────────────────────────

interface DessResponse<T> {
  err: number;
  desc?: string;
  dat?: T;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new SmartessError(`SmartESS HTTP ${res.status}`, res.status);
  const body = (await res.json()) as DessResponse<T>;
  if (body.err !== 0) {
    throw new SmartessError(describeError(body.err, body.desc), body.err);
  }
  return body.dat as T;
}

function describeError(err: number, desc?: string): string {
  const known: Record<number, string> = {
    0x0010: 'كلمة المرور غير صحيحة',
    0x0105: 'اسم المستخدم غير موجود في SmartESS',
    0x000f: 'مفتاح الشركة (company-key) غير صحيح',
    263: 'جهاز جمع البيانات (Datalogger) غير متصل بالإنترنت',
  };
  return known[err] ?? `SmartESS error ${err}${desc ? ` (${desc})` : ''}`;
}

export async function login(usr: string, password: string, companyKey = SMARTESS_COMPANY_KEY): Promise<SmartessAuth> {
  if (!usr || !password) throw new SmartessError('اسم المستخدم وكلمة المرور مطلوبان');
  const salt = Date.now().toString();
  const params: Params = { action: 'authSource', usr, source: '1', 'company-key': companyKey };
  const sign = buildAuthSign(salt, password, params);
  const dat = await getJson<{ token: string; secret: string; expire: number }>(
    `${BASE_URL}?sign=${sign}&salt=${salt}&${transferUriStr(params)}`,
  );
  if (!dat?.token || !dat?.secret) throw new SmartessError('لم يُرجع SmartESS رمز الدخول');
  const lifetimeMs = Number(dat.expire) * 1000 || 24 * 3600 * 1000;
  const renewEarlyMs = Math.min(3600 * 1000, lifetimeMs / 2);
  return { token: dat.token, secret: dat.secret, expiresAt: Date.now() + lifetimeMs - renewEarlyMs };
}

async function request<T>(auth: SmartessAuth, params: Params): Promise<T> {
  const salt = Date.now().toString();
  const sign = buildSign(salt, auth, params);
  return getJson<T>(`${BASE_URL}?sign=${sign}&salt=${salt}&token=${auth.token}&${transferUriStr(params)}`);
}

// ── devices ────────────────────────────────────────────────────────────────

const STATUS_LABEL = ['متصل', 'غير متصل', 'عطل', 'استعداد', 'تحذير'];

interface RawDevice {
  devalias?: string;
  pn: string | number;
  sn: string | number;
  devcode: string | number;
  devaddr: string | number;
  status: string | number;
  energyToday?: string | number;
}

function mapDevice(d: RawDevice): SmartessDevice {
  const status = Number(d.status);
  return {
    name: d.devalias || String(d.pn),
    pn: String(d.pn),
    sn: String(d.sn),
    devcode: String(d.devcode),
    devaddr: String(d.devaddr),
    status,
    statusLabel: STATUS_LABEL[status] ?? `حالة ${d.status}`,
  };
}

export async function listDevices(auth: SmartessAuth): Promise<SmartessDevice[]> {
  const dat = await request<{ device?: RawDevice[] }>(auth, {
    action: 'webQueryDeviceEs',
    i18n: 'en_US',
    source: '1',
    page: '0',
    pagesize: '50',
  });
  return (dat?.device ?? []).map(mapDevice);
}

// ── live data ──────────────────────────────────────────────────────────────

interface ParItem {
  id?: string;
  par?: string;
  val?: string | number;
  unit?: string;
}

type ParGroups = Record<string, ParItem[] | unknown>;

function flattenPars(pars: ParGroups = {}): Map<string, ParItem> {
  const map = new Map<string, ParItem>();
  for (const group of Object.values(pars)) {
    if (!Array.isArray(group)) continue;
    for (const item of group as ParItem[]) {
      const key = item?.id ?? item?.par;
      if (key && !map.has(key)) map.set(key, item);
    }
  }
  return map;
}

function num(item?: ParItem): number | null {
  if (!item) return null;
  const n = Number(item.val);
  return Number.isFinite(n) ? n : null;
}

/** Same as num() but converts kW/kVA readings to W. */
function watts(item?: ParItem): number | null {
  const n = num(item);
  if (n === null) return null;
  return /^k/i.test(item?.unit ?? '') ? n * 1000 : n;
}

const firstNum = (...vals: (number | null)[]) => vals.find((v) => v !== null) ?? null;

export async function getSnapshot(auth: SmartessAuth, device: SmartessDevice): Promise<SmartessSnapshot> {
  const ids = { pn: device.pn, devcode: device.devcode, devaddr: device.devaddr, sn: device.sn };

  const [last, flow, rows] = await Promise.all([
    request<{ gts?: string; pars?: ParGroups }>(auth, {
      action: 'querySPDeviceLastData', i18n: 'en_US', ...ids, source: '1',
    }),
    request<Record<string, ParItem[] | string | number>>(auth, {
      action: 'webQueryDeviceEnergyFlowEs', ...ids, source: '1',
    }).catch(() => null),
    request<{ device?: RawDevice[] }>(auth, {
      action: 'webQueryDeviceEs', i18n: 'en_US', source: '1', page: '0', pagesize: '15', pn: device.pn,
    }).catch(() => null),
  ]);

  const p = flattenPars(last?.pars);
  const g = (id: string) => p.get(id);
  const flowItem = (group: string, par: string) =>
    (Array.isArray(flow?.[group]) ? (flow![group] as ParItem[]) : []).find((i) => i.par === par);
  const row = rows?.device?.find((d) => String(d.sn) === device.sn) ?? rows?.device?.[0];

  const batteryVoltage = num(g('bt_battery_voltage'));
  const chargeA = num(g('bt_battery_charging_current'));
  const dischargeA = num(g('bt_battery_discharge_current'));
  const batteryCurrentA = chargeA ? chargeA : dischargeA ? -dischargeA : chargeA ?? dischargeA;
  const batteryPowerW = firstNum(
    watts(flowItem('bt_status', 'battery_active_power')),
    batteryVoltage !== null && batteryCurrentA !== null ? Math.round(batteryVoltage * batteryCurrentA) : null,
  );

  const gridVoltage = num(g('gd_ac_input_voltage'));
  const mains = String(g('gd_mains_status')?.val ?? '');
  const gridConnected =
    gridVoltage !== null ? gridVoltage > 150 : mains ? /ok|normal|connect/i.test(mains) : null;

  const workingState = (g('sy_status')?.val as string | undefined) ?? null;
  const flowStatus = Number(flow?.status);
  const online = Number.isFinite(flowStatus) ? flowStatus === 0 : row ? Number(row.status) === 0 : true;

  return {
    deviceName: device.name,
    online,
    updatedAt: (typeof flow?.date === 'string' ? flow.date : null) ?? last?.gts ?? null,
    pvPowerW: firstNum(watts(g('pv_output_power')), watts(flowItem('pv_status', 'pv_output_power'))),
    pvVoltage: firstNum(num(g('pv_input_voltage')), num(g('pv_output_voltage'))),
    pvCurrent: num(g('pv_input_current')),
    batterySoc: firstNum(num(g('bt_battery_capacity')), num(g('bt_battery_soc')), num(g('bt_state_of_charge'))),
    batteryVoltage,
    batteryPowerW,
    batteryCurrentA,
    loadPowerW: firstNum(
      watts(flowItem('bc_status', 'load_active_power')),
      watts(g('bc_output_active_power')),
      watts(g('bc_output_apparent_power')),
    ),
    loadPercent: num(g('bc_battery_capacity')), // labelled "AC Output Load" by DessMonitor
    gridVoltage,
    gridFrequency: num(g('gd_ac_input_frequency')),
    gridConnected,
    inverterTemp: firstNum(num(g('sy_inverter_temperature')), num(g('sy_heat_sink_temperature')), num(g('sy_temperature'))),
    ratedPowerW: firstNum(watts(g('sy_nonimal_output_active_power')), watts(g('sy_nonimal_output_apparent_power'))),
    energyTodayKwh: row?.energyToday !== undefined && Number.isFinite(Number(row.energyToday)) ? Number(row.energyToday) : null,
    workingState,
    faulted: /fault|error|abnormal/i.test(workingState ?? ''),
    raw: [...p.entries()].slice(0, 150).map(([id, item]) => ({
      id,
      name: typeof item.par === 'string' && item.par !== id ? item.par : undefined,
      val: String(item.val ?? ''),
      unit: item.unit || undefined,
    })),
  };
}
