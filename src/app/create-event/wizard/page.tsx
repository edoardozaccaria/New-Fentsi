'use client';

import { useEventWizardStore } from '@/store/useEventWizardStore';
import { Step1EventType } from '@/components/wizard/Step1EventType';
import { Step2EventDate } from '@/components/wizard/Step2EventDate';
import { Step3GuestCount } from '@/components/wizard/Step3GuestCount';
import { Step4Location } from '@/components/wizard/Step4Location';
import { Step5VenuePreference } from '@/components/wizard/Step5VenuePreference';
import { Step6Budget } from '@/components/wizard/Step6Budget';
import { Step7Style } from '@/components/wizard/Step7Style';
import { Step8Services } from '@/components/wizard/Step8Services';
import { Step9SpecialRequests } from '@/components/wizard/Step9SpecialRequests';
import { Step10Review } from '@/components/wizard/Step10Review';

export default function WizardPage() {
  const { currentStep } = useEventWizardStore();

  const steps: Record<number, React.ReactNode> = {
    1: <Step1EventType />,
    2: <Step2EventDate />,
    3: <Step3GuestCount />,
    4: <Step4Location />,
    5: <Step5VenuePreference />,
    6: <Step6Budget />,
    7: <Step7Style />,
    8: <Step8Services />,
    9: <Step9SpecialRequests />,
    10: <Step10Review />,
  };

  return steps[currentStep] ?? null;
}
