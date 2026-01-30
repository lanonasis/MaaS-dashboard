type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string;
};

const normalizeMessage = (error?: SupabaseErrorLike) =>
  `${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();

export const isMissingColumnError = (error: SupabaseErrorLike | null, column: string) => {
  if (!error) return false;
  const message = normalizeMessage(error);
  const columnToken = `"${column.toLowerCase()}"`;
  return (
    message.includes(`column ${column.toLowerCase()}`) ||
    message.includes(columnToken) ||
    error.code === "42703"
  );
};

export const isMissingRelationError = (error: SupabaseErrorLike | null, relation: string) => {
  if (!error) return false;
  const message = normalizeMessage(error);
  const relationToken = `"${relation.toLowerCase()}"`;
  return (
    message.includes(`relation ${relation.toLowerCase()}`) ||
    message.includes(relationToken) ||
    error.code === "42P01"
  );
};
