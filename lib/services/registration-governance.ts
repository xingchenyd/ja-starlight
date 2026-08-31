export type RegistrationReviewScope = "ja" | "enterprise";

export function registrationReviewScope(
  publisherOwnerId: string,
): RegistrationReviewScope {
  return publisherOwnerId.startsWith("ja:") ? "ja" : "enterprise";
}

export function canReviewRegistration(
  scope: RegistrationReviewScope,
  reviewerId: string,
  publisherOwnerId: string,
) {
  if (scope === "ja") return registrationReviewScope(publisherOwnerId) === "ja";
  return (
    registrationReviewScope(publisherOwnerId) === "enterprise" &&
    reviewerId === publisherOwnerId
  );
}
