# Quick Reference - Task Attachment & Timeline Feature

## User Guide

### Creating a Task with Images

1. **Open Task Modal**
   - Click "Create Task" button in task management area

2. **Fill Task Details**
   - Title (required)
   - Project (required)
   - Type, Priority, Assignee (optional)
   - Due Date, Description (optional)

3. **Add Images**
   - **Option A - Drag & Drop**: Drag image files directly onto the "Attachments" section
   - **Option B - Click to Browse**: Click the drop zone to open file browser and select images
   - **Preview**: Thumbnails appear below the drop zone
   - **Remove Individual**: Hover over thumbnail and click trash icon to remove

4. **Supported Formats**
   - JPG/JPEG
   - PNG
   - WebP
   - Max 5MB per image

5. **Submit**
   - Click "Create Task" button
   - Wait for upload to complete
   - See success notification

---

### Viewing Task Details & Gallery

1. **Open Task Details**
   - Click on task from list or search results

2. **View Attachments**
   - Scroll to "Attachments" section
   - See image gallery with thumbnails
   - Hover over image to see "View" overlay

3. **Upload More Images**
   - Click "Upload Images" button (if permitted)
   - Select image(s) from file picker
   - New images added to gallery automatically

4. **View Full Image**
   - Click any thumbnail in gallery
   - Full-screen preview modal opens

---

### Image Preview Modal

1. **Navigation**
   - **Previous**: Click left arrow or press ← arrow key
   - **Next**: Click right arrow or press → arrow key
   - **Close**: Click X button or press Escape

2. **Zoom**
   - Zoom Out (-): Button on bottom or zoom out button
   - Zoom In (+): Button on bottom or zoom in button
   - Percentage displayed in center

3. **Actions**
   - **Download**: Click download icon to save image
   - **Delete**: Click red "Delete" button (managers/admins only)
   - Image info (name, counter) on bottom left

---

### Activity Timeline

1. **Event Types**
   - 🟢 **Task Created** - Task initialization
   - 🔄 **Status Changed** - Status updates
   - 👤 **Assignee Updated** - Assignee changes
   - ⚡ **Priority Changed** - Priority modifications
   - 📝 **Description Edited** - Description changes
   - 🖼️ **Images Added** - New images uploaded
   - 🖼️ **Images Removed** - Images deleted
   - And more...

2. **View Event Details**
   - Click event card to expand
   - "Hide details" link to collapse

3. **Field Changes**
   - Shows "Before → After" for each changed field
   - Example: "Priority: Medium → High"

4. **Event Information**
   - User who made change (with role badge)
   - Exact timestamp (date & time)
   - Human-readable event label

---

## Role-Based Capabilities

### Employee
| Feature | Allowed |
|---------|---------|
| Create tasks | ✅ |
| Upload images | ✅ |
| View images | ✅ |
| Download images | ✅ |
| Delete images | ❌ |
| View timeline | ✅ |

### Manager
| Feature | Allowed |
|---------|---------|
| Create tasks | ✅ |
| Upload images | ✅ |
| View images | ✅ |
| Download images | ✅ |
| Delete images | ✅ |
| View timeline | ✅ |
| Edit task (full) | ✅ |

### Admin
| Feature | Allowed |
|---------|---------|
| All manager permissions | ✅ |
| System-wide access | ✅ |

---

## Keyboard Shortcuts (Image Preview)

| Key | Action |
|-----|--------|
| `←` | Previous image |
| `→` | Next image |
| `Esc` | Close preview |
| `+` | Zoom in |
| `-` | Zoom out |

---

## Troubleshooting

### Can't Upload Images?
- ✓ Check file format (JPG, PNG, WebP only)
- ✓ Verify file size is under 5MB
- ✓ Ensure you have permission to upload
- ✓ Try refreshing and retry

### Images Not Showing in Gallery?
- ✓ Wait a moment for images to load
- ✓ Try refreshing the page
- ✓ Check your internet connection
- ✓ Clear browser cache

### Can't Delete Image?
- ✓ Only managers and admins can delete
- ✓ Try refreshing to get latest permissions
- ✓ Contact a manager if needed

### Timeline Not Loading?
- ✓ Wait for timeline to load
- ✓ Try refreshing the page
- ✓ Check if you have view access to task

---

## File Size & Limits

| Item | Limit |
|------|-------|
| Max image size | 5 MB |
| Formats | JPG, PNG, WebP |
| Images per task | Unlimited |
| Supported browsers | All modern browsers |

---

## Tips & Best Practices

### Image Quality
- Use high-resolution images (min 800x600px)
- Avoid very large files (images auto-compressed)
- WebP is preferred for smaller file sizes

### Organizing Images
- Upload related images together
- Use descriptive filenames
- Delete unused/duplicate images

### Activity Timeline
- Check timeline to track all changes
- Use field changes to understand task evolution
- See who changed what and when

---

## API Reference (For Developers)

### Upload Images to Existing Task
```bash
POST /api/tasks/:taskId/attachments
Content-Type: multipart/form-data
Body: files[] (file inputs)
```

### Get Activity Timeline
```bash
GET /api/tasks/:taskId/activity?limit=50&page=1&sort=-createdAt
```

### Delete Attachment
```bash
DELETE /api/tasks/:taskId/attachments?publicId=xxx
```

---

## Frequently Asked Questions

**Q: Can I edit task images?**
A: Not directly - delete old image and upload new one.

**Q: Are images backed up?**
A: Yes, stored on Cloudinary with automatic redundancy.

**Q: Can I access images from other apps?**
A: Links are stored in task - shareable via URL.

**Q: How long are images retained?**
A: As long as the task exists (no auto-deletion).

**Q: Can I bulk upload images?**
A: Yes, select multiple images at once.

**Q: Are there storage limits?**
A: Cloudinary limits apply (check admin settings).

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the implementation guide: `TASK_ATTACHMENT_IMPLEMENTATION.md`
3. Contact system administrator
4. Check browser console for error messages
