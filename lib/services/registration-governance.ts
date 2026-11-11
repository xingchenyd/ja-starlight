export type RegistrationReviewScope = "ja" | "enterprise" | "school";

export function registrationReviewScope(
  publisherOwnerId: string,
): RegistrationReviewScope {
  return publisherOwnerId.startsWith("ja:") ? "ja" : publisherOwnerId.startsWith("school:") ? "school" : "enterprise";
}

export function canReviewRegistration(
  scope: RegistrationReviewScope,
  reviewerId: string,
  publisherOwnerId: string,
) {
  if (scope === "ja") return registrationReviewScope(publisherOwnerId) === "ja";
  if (scope === "school") return publisherOwnerId.startsWith("school:") && reviewerId === publisherOwnerId;
  return (
    registrationReviewScope(publisherOwnerId) === "enterprise" &&
    reviewerId === publisherOwnerId
  );
}
