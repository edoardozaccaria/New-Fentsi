'use client';

import { useEventWizardStore } from '@/store/useEventWizardStore';
import { Step01_EventType } from '@/components/wizard/steps/Step01_EventType';
import { Step02_Location } from '@/components/wizard/steps/Step02_Location';
import { Step03_DateTime } from '@/components/wizard/steps/Step03_DateTime';
import { Step04_Guests } from '@/components/wizard/steps/Step04_Guests';
import { Step05_Budget } from '@/components/wizard/steps/Step05_Budget';
import { Step06_Style } from '@/components/wizard/steps/Step06_Style';
import { Step07_Services } from '@/components/wizard/steps/Step07_Services';
import { Step08_Requirements } from '@/components/wizard/steps/Step08_Requirements';
import { Step09_Language } from '@/components/wizard/steps/Step09_Language';
import { Step10_Review } from '@/components/wizard/steps/Step10_Review';
import React from 'react';

export default function WizardPage() {
  const { currentStep } = useEventWizardStore();

  const steps: Record<number, React.ReactNode> = {
    1: <Step01_EventType />,
    2: <Step02_Location />,
    3: <Step03_DateTime />,
    4: <Step04_Guests />,
    5: <Step05_Budget />,
    6: <Step06_Style />,
    7: <Step07_Services />,
    8: <Step08_Requirements />,
    9: <Step09_Language />,
    10: <Step10_Review />,
  };

  return steps[currentStep] ?? null;
}
