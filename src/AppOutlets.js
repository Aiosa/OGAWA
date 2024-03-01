import {getNewOutlet} from 'reconnect.js';

getNewOutlet(
  'androidLoginPrompt',
  {
    visible: false,
  },
  {autoDelete: false},
);

getNewOutlet(
    'androidPinPrompt',
    {
        visible: false,
    },
    {autoDelete: false},
);

