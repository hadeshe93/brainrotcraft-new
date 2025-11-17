export interface PaymentSuccess {
  title: string;
  description: string;
  transactionId: string;
  nextSteps: {
    title: string;
    items: string[];
  };
  actions: {
    dashboard: string;
    home: string;
  };
}

export interface PaymentCancel {
  title: string;
  defaultMessage: string;
  errorMessages: {
    INVALID_PRODUCT_ID: string;
    INSUFFICIENT_USER_INFO: string;
    CURRENCY_NOT_SUPPORTED: string;
    PAYMENT_FAILED: string;
  };
  help: {
    title: string;
    items: {
      title: string;
      description: string;
    }[];
  };
  actions: {
    tryAgain: string;
    home: string;
  };
  disclaimer: string;
}
