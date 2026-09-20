import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import WithdrawalForm from './WithdrawalForm.jsx';

export default async () => {
  render(<WithdrawalForm />, document.body);
};
