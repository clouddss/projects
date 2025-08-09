# Custom Display Names Feature

This document describes the new custom display names feature for the Blunr frontend application.

## Overview

The custom display names feature allows users to set personalized display names for people who send them messages or tips. This is a **client-side only** feature that stores custom names locally in the browser's localStorage and doesn't affect the actual user's name on the server.

## Features

### ✅ Client-side only storage
- Custom names are stored in localStorage using the key `blunr_custom_display_names`
- No backend changes required
- Data persists across browser sessions

### ✅ Multiple interaction methods
- **Right-click context menu**: Right-click on any username to change display name
- **Edit button**: Hover over usernames to see edit button, click to change display name

### ✅ Smart display format
- Shows custom names in format: `"Custom Name (@originalusername)"`
- Falls back to original username if no custom name is set
- If custom name equals original username, removes the custom name

### ✅ Comprehensive coverage
- **Message list**: Custom names in chat room list
- **Chat header**: Custom name for current conversation recipient
- **Message bubbles**: Custom names for individual message senders
- **Both components**: Works in both MessageComponent and ChatbotComponent

## File Structure

### New Service
- `/src/app/core/services/custom-names/custom-names.service.ts` - Main service for managing custom names
- `/src/app/core/services/custom-names/custom-names.service.spec.ts` - Unit tests

### Updated Components
- `/src/app/message/message.component.ts` - Added custom name methods
- `/src/app/message/message.component.html` - Added UI elements
- `/src/app/message/message.component.scss` - Added styling
- `/src/app/shared/components/chatbot/chatbot.component.ts` - Added custom name methods
- `/src/app/shared/components/chatbot/chatbot.component.html` - Added UI elements  
- `/src/app/shared/components/chatbot/chatbot.component.scss` - Added styling

## How to Use

### For Users

1. **In the message list**:
   - Right-click on any username to open change display name dialog
   - Or hover over username and click the edit icon (✏️)

2. **In the chat interface**:
   - Right-click on the recipient's name in the header
   - Or hover and click the edit icon next to the name
   - Right-click on any message sender's name
   - Or hover and click the edit icon next to message names

3. **Setting custom names**:
   - Enter your desired custom name in the prompt
   - Leave empty to remove custom name
   - Custom names are automatically trimmed of whitespace

### For Developers

```typescript
// Inject the service
constructor(private customNamesService: CustomNamesService) {}

// Set a custom name
this.customNamesService.setCustomName(userId, 'My Custom Name', 'originalusername');

// Get formatted display name
const displayName = this.customNamesService.getFormattedDisplayName(userId, 'originalusername');

// Remove custom name
this.customNamesService.removeCustomName(userId);
```

## API Reference

### CustomNamesService Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `setCustomName()` | userId, customName, originalUsername | Set custom display name for a user |
| `getCustomName()` | userId | Get custom name data for a user |
| `getFormattedDisplayName()` | userId, originalUsername | Get formatted display name with fallback |
| `removeCustomName()` | userId | Remove custom display name for a user |
| `getAllCustomNames()` | none | Get all custom names (for debugging) |
| `clearAllCustomNames()` | none | Clear all custom names |

### Data Structure

```typescript
interface CustomDisplayName {
  userId: string;
  customName: string;
  originalUsername: string;
}
```

## Browser Compatibility

- ✅ Chrome/Chromium-based browsers
- ✅ Firefox  
- ✅ Safari
- ✅ Edge
- ⚠️ Requires localStorage support (IE8+)

## Testing

### Manual Testing Steps

1. **Message List Testing**:
   - Go to the messages page
   - Right-click on a username in the chat list
   - Enter a custom name and verify it displays correctly
   - Refresh the page and verify the custom name persists

2. **Chat Interface Testing**:
   - Open a chat conversation
   - Right-click on the recipient's name in the header
   - Set a custom name and verify it updates
   - Send/receive messages and verify sender names can be customized
   - Test the edit buttons on hover

3. **Edge Cases**:
   - Set empty custom name (should remove)
   - Set custom name same as original (should remove)
   - Test with very long names
   - Test special characters in names

### Unit Tests

Run the service tests:
```bash
npm test -- --include='**/custom-names.service.spec.ts'
```

## Performance Considerations

- Minimal memory footprint (only stores user ID mapping)
- localStorage operations are synchronous but fast
- No network requests required
- Service uses BehaviorSubject for reactive updates

## Future Enhancements

Potential future improvements:
- Sync custom names across devices (requires backend)
- Import/export custom names
- Bulk custom name management interface
- Custom name categories or tags
- Search custom names

## Troubleshooting

### Custom names not persisting
- Check if localStorage is enabled in browser
- Check browser storage quota
- Verify no extensions are clearing localStorage

### Custom names not updating
- Check browser console for JavaScript errors
- Verify service is properly injected in components
- Check that user IDs are consistent

### UI elements not appearing
- Verify CSS classes are not conflicting
- Check that hover states are working
- Ensure click handlers are properly bound

## Technical Notes

### Storage Format
```json
{
  "user123": {
    "userId": "user123",
    "customName": "My Friend",
    "originalUsername": "john_doe"
  }
}
```

### Error Handling
- Graceful fallback to original username if custom name service fails
- localStorage errors are caught and logged to console
- Invalid user IDs or names are silently ignored

### Accessibility
- Proper ARIA labels on all interactive elements
- Keyboard navigation support
- Screen reader friendly
- High contrast hover states