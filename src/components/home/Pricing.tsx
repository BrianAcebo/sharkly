import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CheckCircle, Users, Clock, MessageSquare, Mail } from 'lucide-react';

const Pricing: React.FC = () => {
  const plans = [
    {
      name: 'Starter',
      price: 119,
      period: 'month',
      description: 'Perfect for small teams getting started',
      features: [
        { icon: Users, text: '1 seat' },
        { icon: Clock, text: '500 minutes' },
        { icon: MessageSquare, text: '200 SMS' },
        { icon: Mail, text: '1,000 emails' }
      ],
      overages: [
        '$0.18/min overage',
        '$0.04/SMS overage',
        '$0.01/email overage'
      ],
      allInCost: 62.35,
      margin: 56.65,
      percentage: 48,
      popular: false
    },
    {
      name: 'Growth',
      price: 499,
      period: 'month',
      description: 'Ideal for growing teams',
      effectivePrice: '$100/seat',
      features: [
        { icon: Users, text: '5 seats' },
        { icon: Clock, text: '3,000 minutes' },
        { icon: MessageSquare, text: '1,000 SMS' },
        { icon: Mail, text: '5,000 emails' }
      ],
      overages: [
        '$0.18/min overage',
        '$0.04/SMS overage',
        '$0.01/email overage'
      ],
      allInCost: 293,
      margin: 206,
      percentage: 41,
      popular: true
    },
    {
      name: 'Scale',
      price: 899,
      period: 'month',
      description: 'Built for enterprise teams',
      effectivePrice: '$90/seat',
      features: [
        { icon: Users, text: '10 seats' },
        { icon: Clock, text: '6,000 minutes' },
        { icon: MessageSquare, text: '2,000 SMS' },
        { icon: Mail, text: '10,000 emails' }
      ],
      overages: [
        '$0.18/min overage',
        '$0.04/SMS overage',
        '$0.01/email overage'
      ],
      allInCost: 530,
      margin: 369,
      percentage: 41,
      popular: false
    }
  ];

  return (
    <section id="pricing" className="py-24 bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Choose the plan that fits your team's needs. All plans include a 7-day free trial.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
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
                    ${plan.price}
                    <span className="text-lg font-normal text-gray-500">/{plan.period}</span>
                  </div>
                  {plan.effectivePrice && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {plan.effectivePrice} effective
                    </div>
                  )}
                </div>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  {plan.description}
                </p>
              </CardHeader>

              <CardContent className="space-y-6 text-center">
                {/* Bundled Features */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
                    Bundled:
                  </h4>
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex justify-center text-left items-center text-sm text-gray-600 dark:text-gray-400">
                      <feature.icon className="h-4 w-4 mr-3 text-red-500" />
                      {feature.text}
                    </div>
                  ))}
                </div>

                {/* Overages */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
                    Overages:
                  </h4>
                  {plan.overages.map((overage, index) => (
                    <div key={index} className="text-xs text-gray-500 dark:text-gray-400">
                      {overage}
                    </div>
                  ))}
                </div>

                {/* Cost Breakdown */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">All-in cost:</span>
                      <span className="font-medium">${plan.allInCost}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Margin:</span>
                      <span className="font-medium text-green-600">${plan.margin} (~{plan.percentage}%)</span>
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
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trial Notice */}
        <div className="text-center mt-12">
          <div className="inline-flex items-center space-x-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-6 py-3 rounded-lg">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">7-day free trial on all plans</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
