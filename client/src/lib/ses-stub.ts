// SES stub - prevents SES from being bundled
// SES breaks wallet SDKs by removing/freezing JavaScript intrinsics
// This empty stub ensures any SES imports fail gracefully instead of breaking wallets

export default {};
export const lockdown = () => {
  if (process.env.NODE_ENV === 'development') {
    console.warn('SES lockdown() called but stubbed out - this is intentional to prevent wallet SDK breakage');
  }
};
export const harden = (obj: any) => obj;
export const Compartment = class {};
export const makeCompartment = () => ({});
export const evaluate = () => {};

