#!/usr/bin/env python
"""
Migration script to remove the deleted_chat table from the database.
This script safely drops the deleted_chat table if it exists.
"""

import os
import sqlite3
import sys

# Path to the database file - change this if your database is in a different location
DB_PATH = "instance/chat.db"

def remove_deleted_chat_table():
    """Remove the deleted_chat table from the database"""
    
    # Check if database file exists
    if not os.path.exists(DB_PATH):
        print(f"Database file not found at: {DB_PATH}")
        print("Please run this script from the root directory of your application.")
        return False
    
    try:
        # Connect to the database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check if the table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='deleted_chat'")
        if not cursor.fetchone():
            print("The 'deleted_chat' table does not exist in the database.")
            conn.close()
            return True
        
        # Drop the table
        print("Removing 'deleted_chat' table...")
        cursor.execute("DROP TABLE deleted_chat")
        conn.commit()
        
        # Verify the table is gone
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='deleted_chat'")
        if not cursor.fetchone():
            print("The 'deleted_chat' table has been successfully removed!")
        else:
            print("Error: Failed to remove the table.")
            conn.close()
            return False
        
        # Vacuum the database to reclaim space
        print("Optimizing database...")
        cursor.execute("VACUUM")
        conn.commit()
        
        conn.close()
        return True
        
    except sqlite3.Error as e:
        print(f"SQLite error: {e}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    print("Database Migration - Remove 'deleted_chat' table")
    print("-" * 50)
    
    success = remove_deleted_chat_table()
    
    if success:
        print("\nMigration completed successfully!")
    else:
        print("\nMigration failed. Please check the errors above.")
        sys.exit(1)