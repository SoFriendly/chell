use crate::Project;
use rusqlite::{Connection, params};
use std::path::PathBuf;

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(path: PathBuf) -> Result<Self, String> {
        let conn = Connection::open(&path).map_err(|e| e.to_string())?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                path TEXT NOT NULL,
                last_opened TEXT NOT NULL
            )",
            [],
        )
        .map_err(|e| e.to_string())?;

        Ok(Self { conn })
    }

    pub fn add_project(&self, project: &Project) -> Result<(), String> {
        self.conn
            .execute(
                "INSERT OR REPLACE INTO projects (id, name, path, last_opened) VALUES (?1, ?2, ?3, ?4)",
                params![project.id, project.name, project.path, project.last_opened],
            )
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn remove_project(&self, id: &str) -> Result<(), String> {
        self.conn
            .execute("DELETE FROM projects WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_project(&self, id: &str) -> Result<Option<Project>, String> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, name, path, last_opened FROM projects WHERE id = ?1")
            .map_err(|e| e.to_string())?;

        let mut rows = stmt
            .query(params![id])
            .map_err(|e| e.to_string())?;

        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            Ok(Some(Project {
                id: row.get(0).map_err(|e| e.to_string())?,
                name: row.get(1).map_err(|e| e.to_string())?,
                path: row.get(2).map_err(|e| e.to_string())?,
                last_opened: row.get(3).map_err(|e| e.to_string())?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn get_all_projects(&self) -> Result<Vec<Project>, String> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, name, path, last_opened FROM projects ORDER BY last_opened DESC")
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| {
                Ok(Project {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    path: row.get(2)?,
                    last_opened: row.get(3)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut projects = Vec::new();
        for row in rows {
            projects.push(row.map_err(|e| e.to_string())?);
        }

        Ok(projects)
    }
}
