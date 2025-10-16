import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CheckCircle, Users, Clock, MessageSquare, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface PlanCatalogEntry {
	plan_code: string;
	name: string;
	description: string | null;
	included_seats: number;
	included_minutes: number;
	included_sms: number;
	included_emails: number;
	base_price_cents: number;
}

type FeatureType = 'seats' | 'minutes' | 'sms' | 'emails';

const featureIcon: Record<FeatureType, typeof Users> = {
	seats: Users,
	minutes: Clock,
	sms: MessageSquare,
	emails: Mail
};

const formatCurrency = (cents: number) => {
	return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
};

const describeFeature = (plan: PlanCatalogEntry, type: FeatureType) => {
	switch (type) {
		case 'seats':
			return `${plan.included_seats.toLocaleString()} seat${plan.included_seats === 1 ? '' : 's'}`;
		case 'minutes':
			return `${plan.included_minutes.toLocaleString()} minutes`; 
		case 'sms':
			return `${plan.included_sms.toLocaleString()} SMS`;
		case 'emails':
			return plan.included_emails > 0 ? `${plan.included_emails.toLocaleString()} emails` : 'Unlimited emails';
		default:
			return '';
	}
};

const Pricing: React.FC = () => {
	const [plans, setPlans] = useState<PlanCatalogEntry[] | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		const fetchPlans = async () => {
			try {
				setLoading(true);
				const resp = await fetch('/api/billing/public/plans');
				if (!resp.ok) {
					throw new Error('Failed to load pricing');
				}
				const data: PlanCatalogEntry[] = await resp.json();
				setPlans(data);
			} catch (error) {
				console.error('Failed to load plans', error);
				toast.error('Pricing is temporarily unavailable.');
				setPlans([]);
			} finally {
				setLoading(false);
			}
		};

		fetchPlans();
	}, []);

	const enrichedPlans = useMemo(() => {
		if (!plans) return [];
		return plans.map((plan, index) => ({
			...plan,
			popular: index === 1
		}));
	}, [plans]);

	return (
    <section id="pricing" className="py-24 bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Choose the plan that fits your team's needs. All plans include a 7‑day pay‑as‑you‑go trial.
          </p>
        </div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
					{enrichedPlans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative transition-all duration-200 hover:shadow-lg ${
                plan.popular
                  ? 'border-red-500 ring-2 ring-red-500 shadow-lg scale-105'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-red-500 text-white px-4 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-semibold">{plan.name}</CardTitle>
                <div className="mt-4">
                  <div className="text-4xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(plan.base_price_cents)}
                    <span className="text-lg font-normal text-gray-500">/month</span>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  {plan.description ?? 'Everything you need to grow with pay-as-you-go usage.'}
                </p>
              </CardHeader>

              <CardContent className="space-y-6 text-center">
                {/* Bundled Features */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
                    Bundled:
                  </h4>
                  {(['seats', 'minutes', 'sms', 'emails'] as FeatureType[]).map((type) => {
                    const Icon = featureIcon[type];
                    return (
                      <div key={type} className="flex justify-center text-left items-center text-sm text-gray-600 dark:text-gray-400">
                        <Icon className="h-4 w-4 mr-3 text-red-500" />
                        {describeFeature(plan, type)}
                      </div>
                    );
                  })}
                </div>

                {/* Overages */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
                    Overages:
                  </h4>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Voice minutes billed at wallet rates
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    SMS usage billed at wallet rates
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Emails currently free
                  </div>
                </div>

                {/* Cost Breakdown */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex justify-between">
                      <span>Included seats</span>
                      <span className="font-medium">{plan.included_seats}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Additional seats</span>
                      <span className="font-medium">Pay-as-you-go via wallet</span>
                    </div>
                  </div>
                </div>

                {/* CTA Button */}
                <Button
                  className={`w-full ${
                    plan.popular
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100'
                  }`}
                >
                  Start 7‑Day Trial
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trial Notice */}
        <div className="text-center mt-12">
          <div className="inline-flex items-center space-x-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-6 py-3 rounded-lg">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">7‑day pay‑as‑you‑go trial on all plans</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
