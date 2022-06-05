import { ProjectDemo } from '../../app/common/model/project-demo';

export const PROJECTDEMO: ProjectDemo[] = [
  {id: '1', name: 'ACH', title: 'ACH Banking',
    desc: 'At we have a passion for what we do! Working with multiple products as an ' +
    'integrated system to streamline your businesses rapidly with high fault tolerance and availability. ' +
    'Building effective solutions cheaper, faster, better with a modern cloud native architecture.',
    redhatTechId: [0, 1, 2, 5],
    productBenefitsId: [0]
  },
  {id: '2', name: 'Real Time Payments', title: 'Real Time Payments',
    desc: 'Real Time Payments with is AWESOME',
    redhatTechId: [3, 4, 5],
    productBenefitsId: [1, 2, 3, 4]
  }
];
