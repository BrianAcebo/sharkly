import { useState } from 'react';
import { AlertTriangle, X, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';

interface DangerConfirmationModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	title: string;
	confirmText: string;
	organizationName: string;
	isLoading?: boolean;
}

interface ConfirmationStep {
	id: string;
	title: string;
	description: string;
	action: 'checkbox' | 'text' | 'button';
	placeholder?: string;
	expectedValue?: string;
	checkboxText?: string;
}

const steps: ConfirmationStep[] = [
	{
		id: 'understand',
		title: 'Understand the consequences',
		description: 'Deleting this organization will permanently remove all data including leads, tasks, team members, and settings. This action cannot be undone.',
		action: 'checkbox',
		checkboxText: 'I understand that this action is permanent and cannot be undone'
	},
	{
		id: 'confirm-name',
		title: 'Confirm organization name',
		description: 'To confirm you want to delete this organization, please type the organization name exactly as shown below.',
		action: 'text',
		placeholder: 'Type the organization name here'
	},
	{
		id: 'final-confirm',
		title: 'Final confirmation',
		description: 'This is your last chance to cancel. Once you click "Delete Organization", the organization and all its data will be permanently removed.',
		action: 'button'
	}
];

export default function DangerConfirmationModal({
	isOpen,
	onClose,
	onConfirm,
	title,
	confirmText,
	organizationName,
	isLoading = false
}: DangerConfirmationModalProps) {
	const [currentStep, setCurrentStep] = useState(0);
	const [stepData, setStepData] = useState<Record<string, any>>({});
	const [isValid, setIsValid] = useState(false);

	const currentStepData = steps[currentStep];

	const handleStepDataChange = (stepId: string, value: any) => {
		const newStepData = { ...stepData, [stepId]: value };
		setStepData(newStepData);
		
		// Validate current step
		validateStep(stepId, value);
	};

	const validateStep = (stepId: string, value: any) => {
		let valid = false;

		switch (stepId) {
			case 'understand':
				valid = value === true;
				break;
			case 'confirm-name':
				valid = value === organizationName;
				break;
			case 'final-confirm':
				valid = value === true;
				break;
		}

		setIsValid(valid);
	};

	const handleNext = () => {
		if (currentStep < steps.length - 1) {
			setCurrentStep(currentStep + 1);
		} else {
			onConfirm();
		}
	};

	const handleBack = () => {
		if (currentStep > 0) {
			setCurrentStep(currentStep - 1);
		}
	};

	const handleClose = () => {
		setCurrentStep(0);
		setStepData({});
		setIsValid(false);
		onClose();
	};

	const renderStepContent = () => {
		switch (currentStepData.action) {
			case 'checkbox':
				return (
					<div className="space-y-4">
						<div className="flex items-start space-x-3">
							<input
								type="checkbox"
								id="understand-checkbox"
								checked={stepData[currentStepData.id] === true}
								onChange={(e) => handleStepDataChange(currentStepData.id, e.target.checked)}
								className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
							/>
							<label htmlFor="understand-checkbox" className="text-sm text-gray-700 dark:text-gray-300">
								{currentStepData.checkboxText}
							</label>
						</div>
					</div>
				);

			case 'text':
				return (
					<div className="space-y-4">
						<div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border">
							<p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Organization name to confirm:
							</p>
							<p className="text-lg font-bold text-gray-900 dark:text-white">
								{organizationName}
							</p>
						</div>
						<input
							type="text"
							placeholder={currentStepData.placeholder}
							value={stepData[currentStepData.id] || ''}
							onChange={(e) => handleStepDataChange(currentStepData.id, e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
						/>
						{stepData[currentStepData.id] && stepData[currentStepData.id] !== organizationName && (
							<div className="flex items-center space-x-2 text-red-600 text-sm">
								<XCircle className="h-4 w-4" />
								<span>Organization name does not match</span>
							</div>
						)}
						{stepData[currentStepData.id] === organizationName && (
							<div className="flex items-center space-x-2 text-green-600 text-sm">
								<CheckCircle className="h-4 w-4" />
								<span>Organization name matches</span>
							</div>
						)}
					</div>
				);

			case 'button':
				return (
					<div className="space-y-4">
						<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
							<div className="flex items-center space-x-2 text-red-800 dark:text-red-200">
								<AlertTriangle className="h-5 w-5" />
								<span className="font-medium">Final Warning</span>
							</div>
							<p className="mt-2 text-sm text-red-700 dark:text-red-300">
								This action will permanently delete the organization and all associated data. 
								This cannot be undone and will affect all team members.
							</p>
						</div>
						<div className="flex items-center space-x-3">
							<input
								type="checkbox"
								id="final-confirm-checkbox"
								checked={stepData[currentStepData.id] === true}
								onChange={(e) => handleStepDataChange(currentStepData.id, e.target.checked)}
								className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
							/>
							<label htmlFor="final-confirm-checkbox" className="text-sm text-gray-700 dark:text-gray-300">
								I understand the consequences and want to proceed with deletion
							</label>
						</div>
					</div>
				);

			default:
				return null;
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 overflow-y-auto">
			<div className="flex min-h-screen items-center justify-center p-4">
				<div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={handleClose} />
				
				<div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full">
					{/* Header */}
					<div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
						<div className="flex items-center space-x-3">
							<div className="flex-shrink-0">
								<AlertTriangle className="h-6 w-6 text-red-600" />
							</div>
							<div>
								<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
									{title}
								</h3>
								<p className="text-sm text-gray-500 dark:text-gray-400">
									Step {currentStep + 1} of {steps.length}
								</p>
							</div>
						</div>
						<button
							onClick={handleClose}
							className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
						>
							<X className="h-6 w-6" />
						</button>
					</div>

					{/* Progress Bar */}
					<div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
						<div className="flex space-x-2">
							{steps.map((_, index) => (
								<div
									key={index}
									className={`flex-1 h-2 rounded-full ${
										index <= currentStep
											? 'bg-red-600'
											: 'bg-gray-200 dark:bg-gray-700'
									}`}
								/>
							))}
						</div>
					</div>

					{/* Content */}
					<div className="p-6">
						<Card className="border-red-200 dark:border-red-800">
							<CardHeader className="pb-4">
								<h4 className="text-lg font-semibold text-gray-900 dark:text-white">
									{currentStepData.title}
								</h4>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									{currentStepData.description}
								</p>
							</CardHeader>
							<CardContent>
								{renderStepContent()}
							</CardContent>
						</Card>
					</div>

					{/* Footer */}
					<div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
						<Button
							variant="outline"
							onClick={currentStep > 0 ? handleBack : handleClose}
							disabled={isLoading}
						>
							{currentStep > 0 ? 'Back' : 'Cancel'}
						</Button>
						
						<Button
							variant="destructive"
							onClick={handleNext}
							disabled={!isValid || isLoading}
							className="min-w-[120px]"
						>
							{isLoading ? (
								<div className="flex items-center space-x-2">
									<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
									<span>Deleting...</span>
								</div>
							) : currentStep === steps.length - 1 ? (
								confirmText
							) : (
								'Next'
							)}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
