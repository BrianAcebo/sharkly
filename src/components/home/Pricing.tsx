import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CheckCircle } from 'lucide-react';

const Pricing: React.FC = () => {
    const plans = [
        {
            name: 'Starter (solo)',
            subtitle: 'Built for solo investigators who want an AI assistant on every case.',
            price: 99,
            market: '~$315 true market value',
            savings: '~70% SAVINGS',
            popular: false,
            features: ['150 investigation steps', '1 investigator seat', 'AI research assistant included']
        },
        {
            name: 'Growth (team)',
            subtitle: 'Ideal for two to three‑person agencies balancing multiple open matters.',
            price: 249,
            market: '~$900 true market value',
            savings: '~72% SAVINGS',
            popular: true,
            features: ['450 investigation steps', 'Up to 3 investigator seats', 'Shared Case OS & storage']
        },
        {
            name: 'Scale (5 seats)',
            subtitle: 'Give a larger investigative team one consistent workflow from intake to report.',
            price: 349,
            market: '~$1,500 true market value',
            savings: '~76% SAVINGS',
            popular: false,
            features: ['750 investigation steps', '5 investigator seats', 'Priority support & onboarding']
        }
    ];

    return (
        <section id="pricing" className="py-24 bg-gray-50 dark:bg-gray-900">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <div className="bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 mb-6 inline-flex items-center rounded-full px-4 py-2 text-sm font-medium">
                        Fair Pricing for Investigators
                    </div>
                    <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Pricing That Reflects True Value</h2>
                    <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                        You get every component of an AI investigative assistant for a fraction of what it costs to assemble the stack yourself. Bundle usage credits are built in. Recharging only when you go above.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                    {plans.map((plan, idx) => (
                        <Card
                            key={idx}
                            className={`relative transition-all duration-200 hover:shadow-lg ${
                                plan.popular
                                    ? 'ring-2 ring-blue-500 shadow-lg scale-105 border-blue-500'
                                    : 'border-gray-200 dark:border-gray-700'
                            }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 w-max -translate-x-1/2">
                                    <Badge className="bg-blue-500 px-4 py-1 text-white">Most Popular</Badge>
                                </div>
                            )}

                            <CardHeader className="pb-4 text-center">
                                <CardTitle className="text-2xl font-semibold">{plan.name}</CardTitle>
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{plan.subtitle}</p>
                                <div className="mt-4">
                                    <div className="text-4xl font-bold text-gray-900 dark:text-white">
                                        ${plan.price}
                                        <span className="text-lg font-normal text-gray-500">/month</span>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-4 text-center">
                                <div>
                                    <div className="text-sm font-medium text-blue-600 dark:text-blue-400">{plan.market}</div>
                                    <div className="text-xs text-emerald-600 dark:text-emerald-400">{plan.savings}</div>
                                </div>
                                <div className="space-y-3">
                                    {plan.features.map((f) => (
                                        <div key={f} className="flex items-center justify-center text-left text-sm text-gray-600 dark:text-gray-400">
                                            <CheckCircle className="mr-3 h-4 w-4 text-blue-500" />
                                            {f}
                                        </div>
                                    ))}
                                </div>

                                <Button className={`w-full ${plan.popular ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100'}`}>
                                    Start 7-Day Trial
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="mt-12 text-center">
                    <div className="inline-flex items-center space-x-2 rounded-lg bg-green-50 px-6 py-3 text-green-700 dark:bg-green-900/20 dark:text-green-300">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">7‑day trial on all plans</span>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Pricing;
