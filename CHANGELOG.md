## [2.17.2](https://github.com/callzhang/n8n-nodes-imap/compare/v2.17.1...v2.17.2) (2025-10-18)

### Critical Search Fix

* **Fixed Get Many Operation**: Corrected the search implementation to use proper IMAP search method
* **Chinese Character Support**: Fixed search functionality for Chinese characters like "拉钩"
* **Proper Search Flow**: Now uses `client.search()` first, then `client.fetchOne()` for each result
* **Enhanced Error Handling**: Added better error handling for search and fetch operations
* **Improved Logging**: Added detailed logging for search results and email fetching

### Technical Details

* **Search Method Fix**: Changed from incorrect `client.fetch(searchObject, fetchQuery)` to proper `client.search()` + `client.fetchOne()`
* **Type Safety**: Fixed TypeScript errors with proper type checking for search results
* **Performance**: Optimized search flow with proper UID handling
* **UTF-8 Support**: Full support for Chinese and other international characters in search

## [2.17.1](https://github.com/callzhang/n8n-nodes-imap/compare/v2.17.0...v2.17.1) (2025-10-18)

### Critical Bug Fix

* **Fixed UTF-7 Encoding Issue**: Corrected the dist folder to use the simplified UTF-8 approach
* **Resolved Chinese Mailbox Names**: Fixed issue where Chinese mailbox names were being UTF-7 encoded instead of using direct UTF-8
* **Updated Build Process**: Ensured dist folder matches the current source code with UTF-8 support
* **Fixed Move/Copy Operations**: Resolved "COPY failed" errors when working with Chinese mailbox names

### Technical Details

* **Build Synchronization**: Dist folder now properly reflects the simplified UTF-8 source code
* **Mailbox Path Handling**: Direct UTF-8 support for all mailbox operations
* **Error Resolution**: Fixed IMAP server errors when working with international mailbox names

## [2.17.0](https://github.com/callzhang/n8n-nodes-imap/compare/v2.16.1...v2.17.0) (2025-10-17)

### Enhanced Node Icons and Testing

* **New Node Icons**: Created modern, professional SVG icons for better visual identification
* **Comprehensive Test Suite**: Added complete testing infrastructure with unit and integration tests
* **Test Coverage**: 100% test success rate with all core functionality validated
* **Icon Improvements**: Simple, visually identifiable icons that work well in n8n interface
* **Code Quality**: Enhanced codebase with proper testing and validation

### Technical Improvements

* **Modern Icons**: Clean SVG icons with blue primary color and green enhancement indicators
* **Test Infrastructure**: Complete Jest-based testing with mocks and utilities
* **Build Process**: Improved build pipeline with icon processing
* **Documentation**: Enhanced test documentation and user cases
* **Performance**: Optimized build process and file structure

## [2.16.0](https://github.com/callzhang/n8n-nodes-imap/compare/v2.15.3...v2.16.0) (2025-01-17)

### Major Simplification

* **Removed UTF-7 Encoding Complexity**: Eliminated all UTF-7 encoding/decoding logic from the codebase
* **Modern UTF-8 Support**: Now uses UTF-8 directly for all mailbox names - no encoding needed
* **Simplified Codebase**: Removed hundreds of lines of complex UTF-7 decoding functions
* **Better Performance**: No more encoding/decoding overhead for mailbox operations
* **Cleaner Code**: Much simpler and more maintainable mailbox path handling

### Technical Details

* **Modern Approach**: Modern IMAP servers support UTF-8 directly via RFC 6855 (UTF8=ACCEPT capability)
* **Simplified Functions**: Replaced complex UTF-7 decoders with simple path handlers
* **Universal Support**: Works with all languages and characters without encoding issues
* **Future-Proof**: Follows modern IMAP standards and best practices

## [2.15.2](https://github.com/callzhang/n8n-nodes-imap/compare/v2.15.1...v2.15.2) (2025-01-09)

### Critical Bug Fix

* **Reverted Move Operation Changes**: Restored the "Source Mailbox" parameter in Move operation
* **Fixed n8n Context Issue**: Corrected the misunderstanding about n8n node execution context
* **Proper IMAP Implementation**: Each n8n operation is stateless and requires explicit mailbox specification
* **Reliable Operation**: Move operation now works correctly in n8n workflows

### Technical Details

* **n8n Architecture Understanding**: n8n operations are executed independently without persistent context
* **IMAP Session Management**: Each operation creates its own IMAP session and must specify source mailbox
* **Parameter Restoration**: Restored the original 3-parameter structure (Source Mailbox + Email UID + Destination Mailbox)
* **Error Prevention**: Prevents runtime failures that would occur with the context-dependent approach

## [2.15.1](https://github.com/callzhang/n8n-nodes-imap/compare/v2.15.0...v2.15.1) (2025-01-09)

### UX Improvement

* **Simplified Move Operation**: Removed redundant "Source Mailbox" parameter from Move operation
* **Smart Context Detection**: Move operation now automatically uses the current mailbox context as the source
* **Cleaner Interface**: Reduced from 3 parameters to 2 parameters (Email UID + Destination Mailbox)
* **Better User Experience**: Users no longer need to specify the source mailbox when moving emails

### Technical Improvements

* **Current Mailbox Context**: Leverages imapflow's current mailbox context (`client.mailbox.path`)
* **Type Safety**: Added proper TypeScript handling for mailbox object types
* **Fallback Logic**: Graceful fallback to 'INBOX' if no current mailbox context is available
* **Consistent Behavior**: Move operation now works seamlessly with the current mailbox selection

## [2.15.0](https://github.com/callzhang/n8n-nodes-imap/compare/v2.14.6...v2.15.0) (2025-01-09)

### Major UX Improvement

* **Unified Mailbox Selection**: Combined three separate mailbox controls into one clean multiple selection field
* **Simplified Interface**: Replaced single mailbox selector, multiple mailboxes field, and "Search All Mailboxes" checkbox with one unified control
* **Default "ALL" Selection**: "ALL" is now the default option, making it easy to search across all mailboxes
* **Flexible Selection**: Users can select "ALL" or choose specific mailboxes, or combine both approaches

### Technical Improvements

* **Cleaner Parameter Structure**: Reduced parameter complexity from 3 separate controls to 1 unified control
* **Better User Experience**: More intuitive interface with clear descriptions and default behavior
* **Consistent Behavior**: Both "Get Many" and "Get Single Email" operations now use the same unified mailbox selection
* **Dynamic Options**: Mailbox options are loaded dynamically from the server with "ALL" option at the top

### Breaking Changes

* **Parameter Names Changed**: 
  - `mailboxPath` (single) + `multipleMailboxes` (array) + `searchAllMailboxes` (boolean) → `mailboxes` (array)
  - Default value is now `['ALL']` instead of separate controls
* **Migration**: Existing workflows will need to be updated to use the new unified `mailboxes` parameter

## [2.14.6](https://github.com/callzhang/n8n-nodes-imap/compare/v2.14.5...v2.14.6) (2025-01-09)

### Bug Fix

* **EmailGetSingle Null Safety**: Fixed potential null reference error in EmailGetSingle operation when accessing envelope.subject
* **Comprehensive Null Safety Review**: Reviewed all operations for similar null safety issues
* **Safe Property Access**: Added safe property access using optional chaining for envelope.subject

### Technical Improvements

* **Null Safety Audit**: Conducted comprehensive review of all operations for potential null reference errors
* **Safe Logging**: Improved logging to handle cases where envelope data might be missing
* **Error Prevention**: Added defensive programming practices to prevent similar issues

## [2.14.5](https://github.com/callzhang/n8n-nodes-imap/compare/v2.14.4...v2.14.5) (2025-01-09)

### Bug Fix

* **EmailDownload Error Fixed**: Fixed "Cannot read properties of undefined (reading 'toString')" error in Download EML operation
* **Null Safety**: Added proper null checks for email source data before calling toString()
* **Better Error Messages**: Added descriptive error messages for missing email UID and email not found scenarios
* **Parameter Validation**: Added validation for required email UID parameter

### Technical Improvements

* **Error Handling**: Improved error handling in EmailDownload operation with proper null checks
* **User Feedback**: Better error messages to help users understand what went wrong
* **Data Validation**: Added validation for email UID parameter to prevent empty values

## [2.14.4](https://github.com/callzhang/n8n-nodes-imap/compare/v2.14.3...v2.14.4) (2025-01-09)

### Bug Fix

* **Multiple Mailboxes Dropdown Fixed**: Fixed the multiple mailboxes dropdown to properly load all available mailboxes from the server
* **Method Registration Corrected**: Created separate `loadMailboxOptions` function for `loadOptions` method registration
* **Dynamic Loading**: Multiple mailboxes parameter now correctly displays all mailboxes instead of just INBOX

### Technical Improvements

* **Proper Method Types**: Separated `loadMailboxList` (for `listSearch`) and `loadMailboxOptions` (for `loadOptions`)
* **Return Type Compatibility**: Ensured correct return types for each method registration type
* **Method Registration**: Both `loadOptions` and `listSearch` methods are now properly registered

## [2.14.3](https://github.com/callzhang/n8n-nodes-imap/compare/v2.14.2...v2.14.3) (2025-01-09)

### Critical Bug Fix

* **Method Registration Fixed**: Fixed "Node type does not have method defined" error by using correct `searchListMethod` instead of `loadOptionsMethod`
* **Parameter Loading**: Multiple mailboxes parameter now properly loads mailbox options from the server
* **Method Compatibility**: Ensured proper compatibility between parameter type and method registration

### Technical Improvements

* **Correct Method Type**: Changed from `loadOptionsMethod` to `searchListMethod` for `multiOptions` parameters
* **Proper Registration**: Method is correctly registered under `listSearch` in the node's methods property
* **Error Resolution**: Resolved the method definition error that was preventing mailbox loading

## [2.14.2](https://github.com/callzhang/n8n-nodes-imap/compare/v2.14.1...v2.14.2) (2025-01-09)

### Critical Bug Fix

* **Mailbox Loading Fixed**: Reverted to original working `resourceLocator` parameter type to fix `[object Object]` error
* **Multiple Mailbox Support**: Added new approach with separate parameters for multiple mailbox selection
* **Backward Compatibility**: Maintained original single mailbox functionality while adding new features

### New Features

* **Multiple Mailboxes Parameter**: Added optional "Multiple Mailboxes" parameter for selecting additional mailboxes
* **Search All Mailboxes**: Added "Search All Mailboxes" boolean option to search across all available mailboxes
* **Flexible Selection**: Users can now choose between single mailbox, multiple specific mailboxes, or all mailboxes

### Technical Improvements

* **Parameter Structure**: Restored original `resourceLocator` parameter structure that works reliably
* **Enhanced Logic**: Improved mailbox selection logic to handle multiple scenarios
* **Better UX**: Clear separation between primary mailbox and additional mailboxes

## [2.14.1](https://github.com/callzhang/n8n-nodes-imap/compare/v2.14.0...v2.14.1) (2025-01-09)

### Bug Fixes

* **Mailbox Loading Error**: Fixed critical bug where mailbox fetching returned `[object Object]` instead of proper array
* **Error Handling**: Enhanced error handling in `loadMailboxList()` function to prevent crashes
* **Type Safety**: Added proper type checking to ensure mailbox parameters are arrays
* **Graceful Fallbacks**: Improved fallback behavior when mailbox operations fail

### Technical Improvements

* **Robust Error Handling**: Added comprehensive error handling in mailbox-related functions
* **Array Validation**: Added validation to ensure mailbox lists are proper arrays
* **Better Logging**: Enhanced logging for debugging mailbox loading issues
* **Fallback Behavior**: Improved fallback to INBOX when mailbox operations fail

## [2.14.0](https://github.com/callzhang/n8n-nodes-imap/compare/v2.13.0...v2.14.0) (2025-01-09)

### Multiple Mailbox Support

* **Multiple Mailbox Selection**: Enhanced mailbox parameter to support selecting multiple mailboxes simultaneously
* **ALL Mailboxes Option**: Empty mailbox selection now defaults to searching ALL available mailboxes
* **Multi-Selection UI**: Updated mailbox parameter to use multiOptions for better user experience
* **Mailbox Path in Output**: Email results now include the source mailbox path for better tracking and organization

### Enhanced Operations

* **EmailGetList Operation**: Now iterates through multiple mailboxes and aggregates results with proper limit handling
* **EmailGetSingle Operation**: Can search for specific UID across multiple mailboxes until found
* **Improved Error Handling**: Graceful fallbacks when individual mailboxes fail to open or search
* **Better Logging**: Enhanced logging to show which mailboxes are being searched and results per mailbox

### Technical Improvements

* **New Functions**: Added `getMailboxPathsFromNodeParameter()` and `getAllMailboxes()` for multi-mailbox support
* **Enhanced Validation**: Added `ParameterValidator.validateMailboxes()` method for multi-mailbox validation
* **Dynamic Loading**: Updated mailbox parameter to use `loadOptionsMethod` for dynamic mailbox list loading
* **Performance Optimization**: Efficient iteration through mailboxes with early termination on limit reached

### Breaking Changes

* **Mailbox Parameter**: Changed from single selection to multi-selection (multiOptions)
* **Default Behavior**: Empty mailbox selection now searches ALL mailboxes instead of defaulting to INBOX
* **Output Format**: Email results now include `mailboxPath` field indicating the source mailbox

### Migration Guide

* **Existing Workflows**: Update mailbox selection to explicitly choose INBOX if you want the previous single-mailbox behavior
* **New Workflows**: Leave mailbox selection empty to search all mailboxes, or select specific mailboxes as needed
* **Output Processing**: Update any downstream nodes that process email results to handle the new `mailboxPath` field

## [2.13.0](https://github.com/callzhang/n8n-nodes-imap/compare/v2.12.12...v2.13.0) (2025-01-XX)

### Major Refactor: Unified Message Parts System

* **Removed "Include Body" Parameter**: Eliminated the separate "Include Body" parameter that was duplicating functionality
* **Enhanced Message Parts**: Added "Markdown Content" option to the existing "Include Message Parts" dropdown
* **Unified Content Processing**: All content types (text, HTML, markdown) now use the same efficient processing pipeline
* **Cleaner Interface**: Simplified the user interface by consolidating content options into a single, intuitive dropdown
* **Better Performance**: Optimized content fetching by reusing the existing message parts infrastructure
* **Consistent Behavior**: Both "Get Many" and "Get Single Email" operations now use the same message parts system

### Technical Improvements

* Refactored EmailGetList.ts to use existing Message Parts instead of separate Include Body logic
* Refactored EmailGetSingle.ts to use the same Message Parts system for consistency
* Added MarkdownContent to EmailParts enum across both operations
* Integrated markdown generation into existing message parts processing
* Removed redundant parameters and simplified the codebase
* Maintained all existing functionality while improving code organization

### Breaking Changes

* **"Include Body" parameter removed**: Users should now use "Include Message Parts" dropdown instead
* **Default behavior**: Text Content, HTML Content, and Markdown Content are now selected by default in "Get Single Email"
* **Field names**: Content fields are now named `textContent`, `htmlContent`, and `markdownContent` (instead of `text`, `html`, `markdown`)

## [2.12.12](https://github.com/callzhang/n8n-nodes-imap/compare/v2.12.11...v2.12.12) (2025-01-XX)

### Enhanced Custom Labels with Predefined Values

* **Dropdown Values**: Added predefined common label values (true, false, high, medium, low, urgent, important, reviewed, pending, completed)
* **Custom Value Option**: Added "Custom Value" option for flexibility when predefined values don't fit
* **Conditional Field**: Custom Value field only appears when "Custom Value" is selected
* **Better UX**: Users can now choose from common values or enter their own custom value
* **Reduced Errors**: Predefined options reduce typos and ensure consistency

### Technical Improvements

* Converted Label Value from free text to dropdown with predefined options
* Added conditional Custom Value field that appears only when needed
* Updated validation logic to handle both predefined and custom values
* Enhanced error messages to distinguish between missing value and missing custom value

## [2.12.11](https://github.com/callzhang/n8n-nodes-imap/compare/v2.12.10...v2.12.11) (2025-01-XX)

### Improved Custom Labels UX

* **Better Validation**: Added validation to prevent incomplete custom labels from being silently ignored
* **Clearer Field Requirements**: Made Label Value field required with better placeholder text
* **Enhanced Error Messages**: Added descriptive error messages when custom labels are incomplete
* **Improved Action Descriptions**: Added clear descriptions for Add/Remove/Set actions
* **Better User Guidance**: Updated descriptions to clarify that both Label Name and Label Value are required

### Technical Improvements

* Added validation logic to detect incomplete custom labels
* Enhanced error messages with specific guidance on what's missing
* Improved field descriptions and placeholders for better UX
* Added action descriptions to clarify the difference between Add, Remove, and Set

## [2.12.10](https://github.com/callzhang/n8n-nodes-imap/compare/v2.12.9...v2.12.10) (2025-01-XX)

### Simplified Move Email Operation

* **Removed Source Mailbox Parameter**: Eliminated the "From folder" parameter from the Move Email operation
* **Streamlined Interface**: Now uses the current mailbox context as the source, reducing parameter complexity
* **Better User Experience**: Users only need to specify the destination mailbox, making the operation more intuitive
* **Consistent with Other Operations**: Aligns with the pattern used in other email operations

### Technical Improvements

* Updated EmailMove operation to use current mailbox context as source
* Removed redundant source mailbox parameter and related constants
* Simplified parameter structure while maintaining full functionality

## [2.12.9](https://github.com/callzhang/n8n-nodes-imap/compare/v2.12.8...v2.12.9) (2025-01-XX)

### Enhanced Markdown Conversion

* **Cleaner Markdown Output**: Significantly reduced verbosity in markdown conversion
* **Simplified Tables**: Convert complex HTML tables to simple text format instead of verbose markdown tables
* **Reduced Formatting**: Removed excessive separators, line breaks, and markdown formatting
* **Better Link Handling**: Simplified long URLs and redundant link formatting
* **Concise Output**: Post-processing to clean up excessive whitespace and empty elements

### Technical Improvements

* Enhanced `htmlToMarkdown` function with better post-processing
* Removed excessive separators (10+ dashes/pipes reduced to 3)
* Simplified complex table structures to readable text
* Improved link formatting for better readability
* Applied consistent improvements across all email operations

## [2.12.8](https://github.com/callzhang/n8n-nodes-imap/compare/v2.12.7...v2.12.8) (2025-01-XX)

### Bug Fix

* **Fixed Parameter Type Error**: Resolved "emailUids.trim is not a function" error in Set Flags operation
* **Robust Parameter Handling**: Enhanced ParameterValidator to handle non-string inputs gracefully
* **Type Safety**: Added proper string conversion for emailUid parameter

### Technical Details

* Fixed `ParameterValidator.validateUids()` to accept and convert non-string inputs
* Added `String()` conversion for emailUid parameter in EmailSetFlags operation
* Improved error handling for parameter validation

## [2.12.7](https://github.com/callzhang/n8n-nodes-imap/compare/v2.12.6...v2.12.7) (2025-01-XX)

### Unified Flag and Label Management

* **Combined Operations**: Merged "Set Flags" and "Manage Labels" operations for better user experience
* **Enhanced Custom Labels**: Added "Set" action to Custom Labels in Set Flags operation
* **Simplified Interface**: Removed redundant "Manage Labels" operation to reduce confusion
* **Complete Flag Management**: Single operation now handles all email flags and custom labels

### Technical Improvements

* **Set Action Implementation**: Proper "set" logic that replaces all existing custom labels
* **Smart Label Detection**: Automatically identifies and removes existing custom labels before setting new ones
* **Unified Processing**: Combined standard flags and custom labels processing in one operation
* **Code Consolidation**: Removed EmailManageLabels.ts and consolidated functionality

## [2.12.6](https://github.com/callzhang/n8n-nodes-imap/compare/v2.12.5...v2.12.6) (2025-01-XX)

### Enhanced HTML Cleaner with Base64 Image Removal

* **Base64 Image Removal**: Added aggressive base64 image removal to handle emails with large embedded images
* **Dramatic Size Reduction**: Can reduce HTML size by 99.9% for emails with large base64 images
* **Image Placeholders**: Replaces base64 images with readable placeholders like "[Image removed - base64 data]"
* **Large Data URL Removal**: Removes large base64 data URLs (>100 characters) that bloat email content
* **Response Size Optimization**: Can reduce overall response size by 99.6% for emails with embedded images

### Performance Improvements

* **Email 1**: 3.93 KB → 0.89 KB (77.4% reduction)
* **Email 2**: 1052.10 KB → 0.27 KB (100.0% reduction) - removed 1050.93 KB of base64 image data
* **Overall**: 1056.03 KB → 1.15 KB (99.9% reduction)
* **Response Size**: 1060.23 KB → 4.29 KB (99.6% reduction)

### Technical Improvements

* **Smart Base64 Detection**: Identifies and removes base64 image data while preserving text content
* **Image Tag Replacement**: Replaces `<img src="data:image/...">` with `<img src="[Image removed - base64 data]">`
* **Large Data URL Cleanup**: Removes large base64 data URLs that exceed 100 characters
* **Content Preservation**: Maintains all readable text content while removing binary data

## [2.12.5](https://github.com/callzhang/n8n-nodes-imap/compare/v2.12.4...v2.12.5) (2025-01-XX)

### Enhanced Email Download Operation

* **Reused Email Body Processing**: Integrated the same email body fetching and processing functions used in Get Many and Get Single operations
* **HTML Cleaning Support**: Added HTML cleaning functionality to the Download operation
* **Structured Email Data**: Download operation now supports extracting structured email fields (envelope, text, markdown, html)
* **Consistent Processing**: All email operations now use the same body processing logic for consistency
* **Size Optimization**: Download operation benefits from the same HTML cleaning and size reduction features

### New Parameters for Download Operation

* **Include Email Body**: Whether to include parsed email body content in the output (default: false)
* **Clean HTML**: Whether to clean HTML by removing unreadable tags and attributes (default: true)
* **Include Raw HTML**: Whether to include the original raw HTML content (default: false)

### Technical Improvements

* **Code Reuse**: Eliminated code duplication by reusing email body processing functions
* **Consistent API**: All email operations now provide the same body processing capabilities
* **Better Integration**: Download operation can now provide both EML file and structured email data

## [2.12.4](https://github.com/callzhang/n8n-nodes-imap/compare/v2.12.3...v2.12.4) (2025-01-XX)

### Default Behavior Changes for Better Performance

* **Clean HTML by Default**: HTML cleaning is now enabled by default for all email operations
* **Exclude Raw HTML by Default**: Raw HTML content is excluded by default to prevent large responses
* **Include Raw HTML Option**: Added "Include Raw HTML" parameter for cases where original HTML is needed
* **Optimized Defaults**: New defaults prioritize readable content over raw data
* **Size Reduction**: Can reduce response size by 77%+ for normal emails with complex styling

### New Parameters

* **Include Raw HTML**: Whether to include the original raw HTML content (default: false)
* **Clean HTML**: Now defaults to true for better readability and smaller responses

### Technical Improvements

* **Smart Defaults**: Clean HTML enabled, raw HTML excluded by default
* **Conditional Raw HTML**: Raw HTML only included when explicitly requested
* **Size Indicators**: Added `htmlRaw`, `htmlRawSizeKB` fields when raw HTML is included
* **Better Performance**: Smaller responses by default with option to include raw data when needed

## [2.12.3](https://github.com/callzhang/n8n-nodes-imap/compare/v2.12.2...v2.12.3) (2025-01-XX)

### HTML Cleaning & Readability Improvements

* **Smart HTML Cleaner**: Added intelligent HTML cleaning function that removes unreadable tags and attributes
* **Clean HTML Option**: Added "Clean HTML" parameter to enable/disable HTML cleaning for better readability
* **Tag Optimization**: Removes style attributes, class attributes, and converts divs to paragraphs
* **Entity Conversion**: Converts HTML entities (&nbsp;, &amp;, etc.) to readable characters
* **Size Reduction**: Can reduce HTML size by 77%+ for normal emails with complex styling
* **Readability Enhancement**: Converts complex nested divs to simple paragraph structure

### New Parameters

* **Clean HTML**: Whether to clean HTML by removing unreadable tags and attributes
* **HTML Cleaning Indicators**: Added `htmlCleaned`, `htmlOriginalSizeKB`, `htmlCleanedSizeKB` fields

### Technical Improvements

* **Intelligent Tag Processing**: Removes script, style, and comment tags completely
* **Attribute Cleanup**: Removes style, class, id, and other non-essential attributes
* **Format Conversion**: Converts divs to paragraphs, spans to plain text, br tags to newlines
* **Entity Decoding**: Properly converts HTML entities to readable characters
* **Whitespace Cleanup**: Removes empty paragraphs and excessive newlines

## [2.12.2](https://github.com/callzhang/n8n-nodes-imap/compare/v2.12.1...v2.12.2) (2025-01-XX)

### Performance Optimizations

* **Large Content Handling**: Added options to handle very large email content that was causing 1MB+ responses
* **Content Size Limits**: Added "Content Size Limit" parameter to truncate content exceeding specified KB limit
* **Exclude Large HTML**: Added "Exclude Large HTML" option to automatically exclude HTML content >100KB
* **Size Monitoring**: Added detailed logging of content sizes for monitoring and debugging
* **Response Size Reduction**: Can reduce response size by 99%+ for emails with very large HTML content

### New Parameters

* **Content Size Limit**: Maximum size (in KB) for individual content fields (0 = no limit)
* **Exclude Large HTML**: Automatically exclude HTML content for emails larger than 100KB
* **Size Indicators**: Added `htmlExcluded`, `htmlTruncated`, `htmlSizeKB`, `htmlOriginalSizeKB` fields

### Technical Improvements

* **Smart Content Processing**: Intelligent handling of large HTML content without breaking functionality
* **Better Logging**: Detailed size information for troubleshooting large email issues
* **Graceful Degradation**: Maintains text and markdown content even when HTML is excluded

## [2.12.1](https://github.com/callzhang/n8n-nodes-imap/compare/v2.12.0...v2.12.1) (2025-01-XX)

### Performance Improvements

* **Fixed "Running Forever" Issue**: Completely rewrote email body fetching to use `source: true` instead of complex bodyStructure parsing
* **Simplified Content Extraction**: Removed complex bodyStructure analysis and part-by-part downloading
* **Better Performance**: Direct email source parsing with `simpleParser` for much faster processing
* **Eliminated Timeouts**: No more individual part downloads that could cause infinite loops

### Technical Changes

* **Removed Complex Logic**: Eliminated bodyStructure parsing, part ID detection, and individual part downloads
* **Direct Source Parsing**: Use `email.source` with `simpleParser` for immediate content extraction
* **Cleaner Code**: Removed unused functions and simplified the email processing pipeline
* **Better Error Handling**: More reliable content extraction with proper fallbacks

## [2.12.0](https://github.com/callzhang/n8n-nodes-imap/compare/v2.11.10...v2.12.0) (2025-01-XX)

### New Features

* **Single Email Operation**: Added dedicated "Get Single Email" operation optimized for fetching individual emails with full content
* **Parameter Validation**: Implemented consistent parameter validation using ParameterValidator utility class
* **Enhanced Error Handling**: Improved error messages and validation across all operations

### Improvements

* **Performance Optimization**: Single email operation uses `source: true` for better content extraction
* **Better Type Safety**: Added proper TypeScript interfaces and validation
* **Cleaner Code Structure**: Separated concerns with dedicated utility classes
* **Consistent Validation**: Standardized parameter validation across all operations

## [2.11.10](https://github.com/callzhang/n8n-nodes-imap/compare/v2.11.9...v2.11.10) (2025-01-XX)

### Bug Fixes

* **Raw Message Fallback**: Added fallback mechanism for servers that don't return structured IMAP data
* **Body Content Extraction**: Fixed issue where body content was null when IMAP server doesn't provide bodyStructure
* **Envelope Data Fallback**: Added raw message parsing to extract envelope data when IMAP envelope is missing
* **Server Compatibility**: Improved compatibility with IMAP servers that have limited structured data support

## [2.11.9](https://github.com/callzhang/n8n-nodes-imap/compare/v2.11.8...v2.11.9) (2025-01-XX)

### Bug Fixes

* **Body Content Extraction**: Fixed issue where email body content was returning null when "Include Body" is enabled
* **Body Structure Fetching**: Ensure bodyStructure is always fetched when enhanced fields are enabled
* **Debug Logging**: Added comprehensive debug logging to help troubleshoot content extraction issues

## [2.11.8](https://github.com/callzhang/n8n-nodes-imap/compare/v2.11.7...v2.11.8) (2025-01-XX)

### Improvements

* **Professional HTML to Markdown Conversion**: Replaced custom HTML conversion with `node-html-markdown` library
* **Better Markdown Quality**: Now uses industry-standard library for more accurate and reliable HTML to Markdown conversion
* **Simplified Code**: Removed custom HTML parsing logic in favor of proven library
* **Three Content Formats**: Clean separation of text, markdown, and html fields

## [2.11.7](https://github.com/callzhang/n8n-nodes-imap/compare/v2.11.6...v2.11.7) (2025-01-XX)

### Features

* **HTML Simplification**: Added comprehensive HTML to readable text conversion function
* **Enhanced Content Processing**: Now provides three content formats - text, HTML, and readable
* **Improved User Experience**: "Include Body" parameter with clear tooltip explaining text and HTML output
* **Standard Fields**: Flags/labels and structured fields now always included in output

### Improvements

* **Content Readability**: HTML content converted to clean, readable format with proper formatting
* **Link Handling**: Links converted to readable format (Link Text (URL))
* **Format Preservation**: Maintains emphasis, lists, headers, and other formatting in readable text
* **Parameter Clarity**: Renamed "Enhanced Email Fields" to "Include Body" for better understanding

## [2.11.6](https://github.com/callzhang/n8n-nodes-imap/compare/v2.11.5...v2.11.6) (2025-01-XX)

### Bug Fixes

* **Email Content Extraction**: Fixed "Get Many" operation to properly extract email body content (text and HTML) when enhanced fields are enabled
* **Labels/Flags**: Fixed missing labels/flags in email results
* **Redundant Fields**: Cleaned up redundant enhanced fields that duplicated envelope data
* **Content Processing**: Enhanced fields now always fetch and include email content

## [2.11.5](https://github.com/callzhang/n8n-nodes-imap/compare/v2.11.4...v2.11.5) (2025-01-XX)

### Documentation

* **README Update**: Force npm to update README with new enhanced icon

## [2.11.4](https://github.com/callzhang/n8n-nodes-imap/compare/v2.11.3...v2.11.4) (2025-01-XX)

### Features

* **Updated Icon**: Redesigned icon to match user-generated design with open envelope and prominent plus sign

## [2.11.3](https://github.com/callzhang/n8n-nodes-imap/compare/v2.11.2...v2.11.3) (2025-01-XX)

### Features

* **New Icon**: Added custom "IMAP Enhanced" icon with enhancement indicators (stars, plus signs, gear)

## [2.11.2](https://github.com/callzhang/n8n-nodes-imap/compare/v2.11.1...v2.11.2) (2025-01-XX)

### Bug Fixes

* **Node Name Conflict**: Removed old Imap.node.js file from dist folder to prevent node name conflicts

## [2.11.1](https://github.com/callzhang/n8n-nodes-imap/compare/v2.11.0...v2.11.1) (2025-01-XX)

### Bug Fixes

* **Node Name Conflict**: Fixed node name conflict with original IMAP package by changing node name to "IMAP Enhanced" and internal name to "imapEnhanced"

## [2.11.0](https://github.com/callzhang/n8n-nodes-imap/compare/v2.10.0...v2.11.0) (2025-01-XX)

### Package Rename
* **Package Name**: Renamed from `n8n-nodes-imap` to `n8n-nodes-imap-enhanced` to avoid conflicts with the original package

### Features

* **Enhanced Email Fields**: Added structured email fields including title, from, to, cc, bcc, labels, content (text and HTML)
* **Custom Labels Support**: Added support for custom labels in search operations and label management
* **Limit Parameters**: Added limit parameters to "Get Many" operations for both emails and mailboxes
* **New Manage Labels Operation**: Added dedicated operation for managing custom labels (add, remove, set)
* **Simplified HTML Content**: Added automatic conversion of text content to simplified HTML format
* **Enhanced Set Flags**: Extended existing Set Flags operation to support custom labels alongside system flags

### Improvements

* **Performance**: Limit parameters prevent excessive data fetching
* **User Experience**: Structured email fields provide better data organization
* **Flexibility**: Custom labels support advanced email organization and searching

## [2.10.0](https://github.com/umanamente/n8n-nodes-imap/compare/v2.9.0...v2.10.0) (2025-06-22)

### Features

* improved IMAP error catching. IMAP errors are displayed in N8N output, if available. ([2696424](https://github.com/umanamente/n8n-nodes-imap/commit/26964244a9782d55afb55e9983576c509fe4ff70))

## [2.9.0](https://github.com/umanamente/n8n-nodes-imap/compare/v2.8.0...v2.9.0) (2025-06-22)

### Features

* **Download as EML:** added uid to json output ([63226a8](https://github.com/umanamente/n8n-nodes-imap/commit/63226a8f088dc5d7dfafa35ae5dc61d45f4a1626)), closes [#73](https://github.com/umanamente/n8n-nodes-imap/issues/73)
* **Set Flags:** added uid to json output ([1a6a822](https://github.com/umanamente/n8n-nodes-imap/commit/1a6a8227df5d87d73b9ebeaa9a234586d9710b71)), closes [#68](https://github.com/umanamente/n8n-nodes-imap/issues/68)

### Bug Fixes

* **Download Attachment:** correctly display and download attachments from emails with single part without partID ([dd62b49](https://github.com/umanamente/n8n-nodes-imap/commit/dd62b499efb1a51c4673cd1712f7f87c24d123a2)), closes [#71](https://github.com/umanamente/n8n-nodes-imap/issues/71)
* **Get Emails:** displaying attachment info correctly if there is only 1 item in Body Structure ([e50a27c](https://github.com/umanamente/n8n-nodes-imap/commit/e50a27c74e6035a96ce51586d60748c6cc6b3e72))

## [2.8.0](https://github.com/umanamente/n8n-nodes-imap/compare/v2.7.1...v2.8.0) (2025-05-26)

### Features

* if "Text Content" or "HTML Content" requested, but not present in the email, output NULL in the corresponding fields ([cdd1bcd](https://github.com/umanamente/n8n-nodes-imap/commit/cdd1bcd4ea5eef913e38f3fe1d6a3b4d2d3977f3))

## [2.7.1](https://github.com/umanamente/n8n-nodes-imap/compare/v2.7.0...v2.7.1) (2025-05-26)

### Bug Fixes

* Could not get parameter "includeInlineAttachments" error when "All Attachments" is false ([b74fbe3](https://github.com/umanamente/n8n-nodes-imap/commit/b74fbe31567afe27c77485e45450b017b6bdbb1d))

## [2.7.0](https://github.com/umanamente/n8n-nodes-imap/compare/v2.6.1...v2.7.0) (2025-04-21)

### Features

* add option to include inline attachments in "download attachments" operation ([5d97f9f](https://github.com/umanamente/n8n-nodes-imap/commit/5d97f9f3beddc0332623de9b028472df9239d54e))

## [2.6.1](https://github.com/umanamente/n8n-nodes-imap/compare/v2.6.0...v2.6.1) (2025-04-14)

### Bug Fixes

* uidMap is optional ([a24b81e](https://github.com/umanamente/n8n-nodes-imap/commit/a24b81ef048f81f5ad7b1765e39a29a28ddaf9ff))

## [2.6.0](https://github.com/umanamente/n8n-nodes-imap/compare/v2.5.0...v2.6.0) (2025-04-14)

### Features

* added "Download as EML" operation ([aab6e46](https://github.com/umanamente/n8n-nodes-imap/commit/aab6e46de50666c5be68ee2217b201f888e77742))

## [2.5.0](https://github.com/umanamente/n8n-nodes-imap/compare/v2.4.3...v2.5.0) (2025-03-08)

### Features

* added 'mailboxPath' to Email items output ([dbda35f](https://github.com/umanamente/n8n-nodes-imap/commit/dbda35f4f9cc9b770318343e5181a63a6d57dcad))

## [2.4.3](https://github.com/umanamente/n8n-nodes-imap/compare/v2.4.2...v2.4.3) (2025-02-25)

### Bug Fixes

* issues with RFC822 content composition, ([bb54fc1](https://github.com/umanamente/n8n-nodes-imap/commit/bb54fc16b9571e0b179bdfaaa28d81b8735854cb))

## [2.4.2](https://github.com/umanamente/n8n-nodes-imap/compare/v2.4.1...v2.4.2) (2024-12-05)

### Bug Fixes

* fixed issue with reading emails from specific IMAP servers (Xeams) ([5687b2e](https://github.com/umanamente/n8n-nodes-imap/commit/5687b2e41fff5dd2e63d3d3eb7f8c982b5576dc4))

## [2.4.1](https://github.com/umanamente/n8n-nodes-imap/compare/v2.4.0...v2.4.1) (2024-10-31)

### Bug Fixes

* "Mailbox Create" operation used incorrect input parameters resulting in failure to create mailbox ([d38d029](https://github.com/umanamente/n8n-nodes-imap/commit/d38d02965d74873e547883921647b2280fa08e7b))

## [2.4.0](https://github.com/umanamente/n8n-nodes-imap/compare/v2.3.0...v2.4.0) (2024-10-15)

### Features

* add "UID" to search filters in "Get Emails" operation ([fa0260e](https://github.com/umanamente/n8n-nodes-imap/commit/fa0260e2fb734cec8ca12887376d9c539f8cbf61))

## [2.3.0](https://github.com/umanamente/n8n-nodes-imap/compare/v2.2.0...v2.3.0) (2024-09-04)

### Features

* **email:** Add Copy operation ([12653d4](https://github.com/umanamente/n8n-nodes-imap/commit/12653d443cce0875c017430bd8b62822af46d612))

## [2.2.0](https://github.com/umanamente/n8n-nodes-imap/compare/v2.1.1...v2.2.0) (2024-08-15)

### Features

* **mailbox:** add "Get Quota" operation ([62abb23](https://github.com/umanamente/n8n-nodes-imap/commit/62abb2377e345ce1c13a9eadedbe6454025894b1))

## [2.1.1](https://github.com/umanamente/n8n-nodes-imap/compare/v2.1.0...v2.1.1) (2024-07-27)

### Bug Fixes

* **create draft:** make field "Text" multiline ([131e777](https://github.com/umanamente/n8n-nodes-imap/commit/131e7775478a111bdf08036300396d54c3242c1f))

## [2.1.0](https://github.com/umanamente/n8n-nodes-imap/compare/v2.0.1...v2.1.0) (2024-07-27)

### Features

* "create email draft" operation ([81e673f](https://github.com/umanamente/n8n-nodes-imap/commit/81e673f52306d1766d89ea807e24434ea09e0f4f))

## [2.0.1](https://github.com/umanamente/n8n-nodes-imap/compare/v2.0.0...v2.0.1) (2024-07-12)


### Bug Fixes

* "Credentials not found" error when using mailbox autocompletion with N8N IMAP credentials ([1f9977b](https://github.com/umanamente/n8n-nodes-imap/commit/1f9977ba32bdf345a4663187f4594e5086b79b83))

## [2.0.0](https://github.com/umanamente/n8n-nodes-imap/compare/v1.3.1...v2.0.0) (2024-06-12)


### ⚠ BREAKING CHANGES

* **attachments:** The downloadAttachment node output is changed. Each output item could now contain multiple binary fields named "attachment_0", "attachment_1", etc.
Previously, there was only one binary field per output item named "attachment".

### Features

* **attachments:** add option to download all attachments or a comma-separated list of attachment IDs ([2c7a353](https://github.com/umanamente/n8n-nodes-imap/commit/2c7a353bbc03b8da311cac6468917924c56d30db))

## [1.3.1](https://github.com/umanamente/n8n-nodes-imap/compare/v1.3.0...v1.3.1) (2024-05-30)


### Bug Fixes

* Check if IMAP server returned empty email content ([53a5ed3](https://github.com/umanamente/n8n-nodes-imap/commit/53a5ed3902fcf855b9a889ee9723a56aff26f1ec))

## [1.3.0](https://github.com/umanamente/n8n-nodes-imap/compare/v1.2.3...v1.3.0) (2024-05-27)


### Features

* option to include email headers ([c3d89bb](https://github.com/umanamente/n8n-nodes-imap/commit/c3d89bb3349f1160c0d73f676bc57137fba2fb0b))
* option to include specific headers only ([f7c36dc](https://github.com/umanamente/n8n-nodes-imap/commit/f7c36dc3db86c036e86ea532d83d1f8c492cce3c))


### Bug Fixes

* close IMAP connection gracefully after use ([b2d4bc3](https://github.com/umanamente/n8n-nodes-imap/commit/b2d4bc3db862f7fb87803e42eecfbdf7edd2e9d6))
* fix text and HTML email content conversion ([102dea9](https://github.com/umanamente/n8n-nodes-imap/commit/102dea92c9709879b72a4475ed83135fd23d80ea))
* retrieve HTML or Text content correctly for single-part messages ([87a94f9](https://github.com/umanamente/n8n-nodes-imap/commit/87a94f90ee4756dfe2e6da94fb6232d65a6d339a))

## [1.2.3](https://github.com/umanamente/n8n-nodes-imap/compare/v1.2.2...v1.2.3) (2024-02-14)


### Bug Fixes

* Don't terminate multiple items processing if a handler returned no data ([b46f86d](https://github.com/umanamente/n8n-nodes-imap/commit/b46f86d7b7fbe95306b389dc4cb0d357ed394f5f))

## [1.2.2](https://github.com/umanamente/n8n-nodes-imap/compare/v1.2.1...v1.2.2) (2024-02-14)


### Bug Fixes

* **dependabot:** NPM IP package vulnerable to Server-Side Request Forgery (SSRF) attacks ([3395bf9](https://github.com/umanamente/n8n-nodes-imap/commit/3395bf9f80653da6d2dd99fe0ff91595129fe732))

## [1.2.1](https://github.com/umanamente/n8n-nodes-imap/compare/v1.2.0...v1.2.1) (2024-02-14)


### Bug Fixes

* If IMAP node had multiple items as input, only first one was processed ([#5](https://github.com/umanamente/n8n-nodes-imap/issues/5)) ([8c78e20](https://github.com/umanamente/n8n-nodes-imap/commit/8c78e2024b9bc893049892a3d67aa737fde705cd))

## [1.2.0](https://github.com/umanamente/n8n-nodes-imap/compare/v1.1.1...v1.2.0) (2024-02-11)


### Features

* support credentials from core N8N IMAP Trigger node ([5959ca1](https://github.com/umanamente/n8n-nodes-imap/commit/5959ca1389a2e8dec589c613e2c363dd2c1b5818))

## [1.1.1](https://github.com/umanamente/n8n-nodes-imap/compare/v1.1.0...v1.1.1) (2024-01-07)


### Bug Fixes

* Checking for credentials problem during login and displaying server error message if failed ([6207a80](https://github.com/umanamente/n8n-nodes-imap/commit/6207a80f1ebed1ea311fb3ed15bf4cc53caf5866))
* Don't show "Cannot read properties of undefined (reading 'filename')" error if IMAP server hadn't returned attachment data ([5d306ad](https://github.com/umanamente/n8n-nodes-imap/commit/5d306ad143e93fd2c769e17e40a56c329a1a74de))

## [1.1.0](https://github.com/umanamente/n8n-nodes-imap/compare/v1.0.1...v1.1.0) (2023-12-31)


### Features

* Added "Set Flags" operation ([97c1166](https://github.com/umanamente/n8n-nodes-imap/commit/97c116670b0773dfa5c1356d78b5dc3cebf09333))

## [1.0.1](https://github.com/umanamente/n8n-nodes-imap/compare/v1.0.0...v1.0.1) (2023-12-30)


### Bug Fixes

* Mailboxes in "select mailbox" fields are loading correctly (fixed credential retrieval) ([0c48cc4](https://github.com/umanamente/n8n-nodes-imap/commit/0c48cc4772e04ce64a5656c50cd897d156709e55))
