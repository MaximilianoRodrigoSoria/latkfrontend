import seller from '../documentation/content/seller/flows.md';
import admin from '../documentation/content/admin/flows.md';
import operator from '../documentation/content/operator/flows.md';
import auditor from '../documentation/content/auditor/flows.md';
import { documentationHandler } from './documentation';

export default { fetch: documentationHandler({ seller, admin, operator, auditor }) };
