/**
 * Re-export from shared credits (single source of truth).
 * Use this import in frontend code: import { CREDIT_COSTS } from '../lib/credits'
 */
export {
	CREDIT_COSTS,
	getGenerateAllCreditsCost,
	PLANS,
	OVERAGE_RATE,
	type CreditCostKey
} from '../../shared/credits';
