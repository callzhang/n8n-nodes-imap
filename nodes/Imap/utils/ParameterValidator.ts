// Parameter validation utility class

export class ParameterValidator {
  /**
   * Extract mailbox name from parameter (handles both string and object formats)
   */
  static extractMailboxName(mailboxParam: string | { mode: string; value: string }): string {
    if (typeof mailboxParam === 'string') {
      return mailboxParam;
    }
    if (mailboxParam && typeof mailboxParam === 'object' && mailboxParam.value) {
      return mailboxParam.value;
    }
    throw new Error('Invalid mailbox parameter format');
  }

  /**
   * Validate mailbox parameter
   */
  static validateMailbox(mailboxParam: string | { mode: string; value: string }): void {
    const mailbox = this.extractMailboxName(mailboxParam);
    if (!mailbox || mailbox.trim() === '') {
      throw new Error('Mailbox name is required and cannot be empty');
    }
  }

  /**
   * Validate multiple mailbox parameters
   * Empty array is allowed (means ALL mailboxes)
   */
  static validateMailboxes(mailboxParams: string[]): void {
    if (!Array.isArray(mailboxParams)) {
      throw new Error('Mailbox parameter must be an array');
    }

    // Empty array is allowed (means ALL mailboxes)
    if (mailboxParams.length === 0) {
      return;
    }

    // Validate each mailbox
    for (const mailbox of mailboxParams) {
      if (!mailbox || mailbox.trim() === '') {
        throw new Error('All mailbox names must be non-empty strings');
      }
    }
  }

  /**
   * Validate email UID parameter
   */
  static validateUid(emailUid: string): void {
    if (!emailUid || emailUid.trim() === '') {
      throw new Error('Email UID is required and cannot be empty');
    }

    // Check if UID is a valid number
    const uidNumber = parseInt(emailUid, 10);
    if (isNaN(uidNumber) || uidNumber <= 0) {
      throw new Error('Email UID must be a valid positive number');
    }
  }

  /**
   * Validate multiple UIDs (comma-separated)
   */
  static validateUids(emailUids: string | number | any): string[] {
    // Convert to string if not already
    const uidString = String(emailUids || '');

    if (!uidString || uidString.trim() === '') {
      throw new Error('Email UIDs are required and cannot be empty');
    }

    const uids = uidString.split(',').map(uid => uid.trim()).filter(uid => uid !== '');
    if (uids.length === 0) {
      throw new Error('At least one valid email UID is required');
    }

    // Validate each UID
    for (const uid of uids) {
      this.validateUid(uid);
    }

    return uids;
  }

  /**
   * Validate limit parameter
   */
  static validateLimit(limit: number): void {
    if (limit < 0) {
      throw new Error('Limit must be a non-negative number');
    }
  }

  /**
   * Validate search parameters
   */
  static validateSearchParameters(searchParams: any): void {
    if (!searchParams || typeof searchParams !== 'object') {
      throw new Error('Search parameters must be a valid object');
    }
  }
}
