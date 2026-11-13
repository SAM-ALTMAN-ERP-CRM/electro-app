import React from 'react';
import CampaignsPage from './pages/CampaignsPage';
import AudiencesPage from './pages/AudiencesPage';
import AudienceDetailPage from './pages/AudienceDetailPage';
import EnquiryPage from './pages/EnquiryPage';
import TemplatesPage from './pages/TemplatesPage';
import SurveysPage from './pages/SurveysPage';
import SurveyRespondPage from './pages/SurveyRespondPage';
import SurveyResultsPage from './pages/SurveyResultsPage';

/**
 * CRM-4 Marketing & Engagement module registration.
 *
 * Rules:
 * - Module accessible to roles: admin, sales
 * - All standard routes accessible to: admin, sales
 * - No internal BrowserRouter or navbar: handled by shared shell
 * - Routes with labels appear in the shared sidebar navigation
 * - Dynamic detail and action screens (/audiences/:id, /surveys/:id/respond, /surveys/:id/results)
 *   remain accessible via direct deep-links and in-page navigation without cluttering the sidebar.
 */
export default {
  id: 'crm4',
  title: 'Marketing',
  roles: ['admin', 'sales'],
  routes: [
    {
      path: '',
      element: <CampaignsPage />,
      roles: ['admin', 'sales']
    },
    {
      path: 'campaigns',
      label: 'Campaigns',
      element: <CampaignsPage />,
      roles: ['admin', 'sales']
    },
    {
      path: 'audiences',
      label: 'Audiences',
      element: <AudiencesPage />,
      roles: ['admin', 'sales']
    },
    {
      path: 'audiences/:id',
      element: <AudienceDetailPage />,
      roles: ['admin', 'sales']
    },
    {
      path: 'enquiry',
      label: 'Web Enquiry',
      element: <EnquiryPage />,
      roles: ['admin', 'sales']
    },
    {
      path: 'templates',
      label: 'Templates',
      element: <TemplatesPage />,
      roles: ['admin', 'sales']
    },
    {
      path: 'surveys',
      label: 'Surveys',
      element: <SurveysPage />,
      roles: ['admin', 'sales']
    },
    {
      path: 'surveys/:id/respond',
      element: <SurveyRespondPage />,
      roles: ['admin', 'sales']
    },
    {
      path: 'surveys/:id/results',
      element: <SurveyResultsPage />,
      roles: ['admin', 'sales']
    }
  ]
};
