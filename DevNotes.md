# Development Notes

1. **Core Architecture**
The app will be **offline-first**, with a **local database as the source of truth**. Users can write, edit, and search notes entirely offline. **Cloud sync will be optional**, **added later for multi-device access**, and will only **store encrypted copies of entries**.
    - The **cloud serves as a replica**, never as the primary storage. This ensures **privacy**, **offline availability**, and **reliability even when the network is unavailable**.

1. **Local Storage Choice**
    - The app uses **SQLite** as the local database because it supports both **mobile and desktop platforms**.  
    - SQLite allows **structured queries**, making it efficient for **searching** and **filtering notes**.  
    - Avoid using **plain text** or **JSON files** in production because they **do not scale** and are **not secure**.

1. **Data Model**
Each diary entry is structured as follows:  
    1. **Unique ID** – uniquely identifies each note.  
    2. **Creation and last update timestamps** – track when a note was created and last modified, useful for sorting, filtering, and analytics.  
    3. **Content text** – the main body of the diary entry.  
    4. **Encryption flag** – indicates whether the entry is encrypted.  
    5. (Optional) **Mood** and **Tags** – for categorization, filtering, and future analytics.

    A structured model enables **efficient searching**, **filtering**, **analytics**, and supports **future AI features** such as summaries or mood tracking.

1. **Encryption**:
    - The app will **encrypt all diary entries before saving**, using **AES-256**.
    - The encryption key is **derived from the user password** to **protect data** both locally and in the cloud replica.

1. Cloud Sync (Optional):
When adding multi-device support:
    - **Sync only encrypted entries to the cloud** (Firebase, Supabase, or custom backend).
    - **Local database remains the source of truth**.
    - **Implement conflict resolution** if a note is edited on multiple devices before syncing.