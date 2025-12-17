from __future__ import annotations

import json
from typing import Any, Dict, List, Type, TypeVar
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import SQLModel, Session, select

from .database import get_session
from . import models

ModelType = TypeVar("ModelType", bound=SQLModel)


def _generic_routes(model: Type[ModelType], prefix: str, tags: list[str]) -> APIRouter:
    router = APIRouter(prefix=prefix, tags=tags)

    @router.get("", response_model=List[model])
    @router.get("/", response_model=List[model])
    def list_items(
        session: Session = Depends(get_session),
        limit: int = Query(500, le=50000),
        offset: int | None = Query(None, ge=0),
        skip: int | None = Query(None, ge=0),
    ):
        eff_offset = offset if offset is not None else (skip or 0)
        stmt = select(model).offset(eff_offset).limit(limit)

        return session.exec(stmt).all()

    @router.get("/{item_id}", response_model=model)
    def get_item(item_id: int, session: Session = Depends(get_session)):
        item = session.get(model, item_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
        return item

    @router.post("/", response_model=model, status_code=status.HTTP_201_CREATED)
    def create_item(payload: Dict[str, Any], session: Session = Depends(get_session)):
        obj = model(**payload)
        session.add(obj)
        session.commit()
        session.refresh(obj)
        return obj

    @router.put("/{item_id}", response_model=model)
    def update_item(item_id: int, payload: Dict[str, Any], session: Session = Depends(get_session)):
        db_obj = session.get(model, item_id)
        if not db_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
        for k, v in payload.items():
            if k == "id":
                continue
            if hasattr(db_obj, k):
                setattr(db_obj, k, v)
        session.add(db_obj)
        session.commit()
        session.refresh(db_obj)
        return db_obj

    @router.patch("/{item_id}", response_model=model)
    def patch_item(item_id: int, payload: dict, session: Session = Depends(get_session)):
        """Partial update for inline editing"""
        db_obj = session.get(model, item_id)
        if not db_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
        for k, v in payload.items():
            if hasattr(db_obj, k):
                setattr(db_obj, k, v)
        session.add(db_obj)
        session.commit()
        session.refresh(db_obj)
        return db_obj

    @router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
    def delete_item(item_id: int, session: Session = Depends(get_session)):
        db_obj = session.get(model, item_id)
        if not db_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
        session.delete(db_obj)
        session.commit()
        return None

    return router


region_router = _generic_routes(models.Region, "/regions", ["Regions"])
district_router = _generic_routes(models.District, "/districts", ["Districts"])
landmark_router = _generic_routes(models.Landmark, "/landmarks", ["Landmarks"])
pole_router = _generic_routes(models.Pole, "/poles", ["Poles"])
junction_box_router = _generic_routes(models.JunctionBox, "/junction-boxes", ["Junction Boxes"])
component_router = _generic_routes(models.Component, "/components", ["Components"])
credential_router = _generic_routes(models.Credential, "/credentials", ["Credentials"])

# Custom components router to include related credentials and convenient nested data
from fastapi import APIRouter, Depends, Query

component_router = APIRouter(prefix="/components", tags=["Components"])


@component_router.get("")
def list_components(
    session: Session = Depends(get_session),
    limit: int = Query(200, le=50000),
    offset: int | None = Query(None, ge=0),
    skip: int | None = Query(None, ge=0),
):
    # Fetch components with pagination
    eff_offset = offset if offset is not None else (skip or 0)
    stmt = select(models.Component).offset(eff_offset).limit(limit)
    comps = session.exec(stmt).all()
    
    # Get all component IDs to fetch credentials in bulk (avoid N+1 query)
    comp_ids = [c.id for c in comps]
    creds_map = {}
    if comp_ids:
        creds = session.exec(
            select(models.Credential).where(models.Credential.component_id.in_(comp_ids))
        ).all()
        for cred in creds:
            if cred.component_id not in creds_map:
                creds_map[cred.component_id] = []
            creds_map[cred.component_id].append(cred.dict())
    
    # Build result with credentials
    result = []
    for c in comps:
        obj = c.dict()
        obj["credentials"] = creds_map.get(c.id, [])
        result.append(obj)
    return result


@component_router.get("/{item_id}")
def get_component(item_id: int, session: Session = Depends(get_session)):
    c = session.get(models.Component, item_id)
    if not c:
        raise HTTPException(status_code=404, detail="Not found")
    creds = session.exec(select(models.Credential).where(models.Credential.component_id == c.id)).all()
    obj = c.dict()
    obj["credentials"] = [cr.dict() for cr in creds] if creds else []
    return obj


# Audit Log Router
audit_router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@audit_router.get("", response_model=List[models.AuditLog])
def list_audit_logs(
    session: Session = Depends(get_session),
    limit: int = Query(5000, le=50000),
    offset: int = Query(0, ge=0),
    username: str | None = Query(None),
):
    stmt = select(models.AuditLog)
    if username:
        stmt = stmt.where(models.AuditLog.username == username)
    stmt = stmt.order_by(models.AuditLog.id.desc()).offset(offset).limit(limit)
    return session.exec(stmt).all()


@audit_router.post("", response_model=models.AuditLog, status_code=status.HTTP_201_CREATED)
def create_audit_log(payload: models.AuditLog, session: Session = Depends(get_session)):
    session.add(payload)
    session.commit()
    session.refresh(payload)
    return payload


@audit_router.get("/{log_id}", response_model=models.AuditLog)
def get_audit_log(log_id: int, session: Session = Depends(get_session)):
    log = session.get(models.AuditLog, log_id)
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return log


# Global Search Router
search_router = APIRouter(prefix="/search", tags=["Search"])

# Excel Router (raw workbook views)
excel_router = APIRouter(prefix="/excel", tags=["Excel"])


@excel_router.get("/workbooks")
def list_workbooks(
    session: Session = Depends(get_session),
    limit: int = Query(200, le=2000),
    offset: int = Query(0, ge=0),
):
    stmt = select(models.ExcelWorkbook).order_by(models.ExcelWorkbook.id.desc()).offset(offset).limit(limit)
    return session.exec(stmt).all()


@excel_router.get("/workbooks/{workbook_id}")
def get_workbook(workbook_id: int, session: Session = Depends(get_session)):
    wb = session.get(models.ExcelWorkbook, workbook_id)
    if not wb:
        raise HTTPException(status_code=404, detail="Not found")
    return wb


@excel_router.get("/workbooks/{workbook_id}/sheets")
def list_sheets(workbook_id: int, session: Session = Depends(get_session)):
    stmt = select(models.ExcelSheet).where(models.ExcelSheet.workbook_id == workbook_id).order_by(models.ExcelSheet.id.asc())
    return session.exec(stmt).all()


@excel_router.get("/sheets/{sheet_id}")
def get_sheet(sheet_id: int, session: Session = Depends(get_session)):
    sh = session.get(models.ExcelSheet, sheet_id)
    if not sh:
        raise HTTPException(status_code=404, detail="Not found")
    return sh


@excel_router.get("/sheets/{sheet_id}/rows")
def list_sheet_rows(
    sheet_id: int,
    session: Session = Depends(get_session),
    limit: int = Query(200, le=5000),
    offset: int = Query(0, ge=0),
    q: str | None = Query(None, description="Search across cell values"),
    sort_col: str | None = Query(None, description="Column key to sort by"),
    sort_dir: str = Query("asc", pattern="^(asc|desc)$"),
):
    stmt = select(models.ExcelRow).where(models.ExcelRow.sheet_id == sheet_id)
    stmt = stmt.order_by(models.ExcelRow.row_index.asc()).offset(offset).limit(limit)
    rows = session.exec(stmt).all()

    if q:
        needle = q.lower()
        rows = [r for r in rows if needle in json.dumps(r.data, ensure_ascii=False).lower()]

    if sort_col:
        reverse = (sort_dir == "desc")
        def _key(r: models.ExcelRow):
            v = r.data.get(sort_col)
            return ("" if v is None else str(v))
        rows = sorted(rows, key=_key, reverse=reverse)

    return rows


@excel_router.patch("/rows/{row_id}")
def patch_excel_row(row_id: int, payload: Dict[str, Any], session: Session = Depends(get_session)):
    """Excel-like inline editing: PATCH {"ColumnName": "value", ...}"""
    row = session.get(models.ExcelRow, row_id)
    if not row:
        raise HTTPException(status_code=404, detail="Not found")

    data = dict(row.data or {})
    for k, v in payload.items():
        if v is None:
            data.pop(k, None)
        else:
            data[k] = v
    row.data = data
    session.add(row)
    session.commit()
    session.refresh(row)
    return row

@search_router.get("/global")
def global_search(
    q: str = Query(..., min_length=1),
    session: Session = Depends(get_session),
    limit: int = Query(5000, le=50000),
):
    """
    Global search across all entities.
    Returns results from all entity types matching the search term.
    """
    results = {
        "regions": [],
        "districts": [],
        "landmarks": [],
        "poles": [],
        "junction_boxes": [],
        "components": [],
        "credentials": [],
        "excel": [],
    }
    
    search_term = f"%{q}%"
    
    # Search regions
    regions = session.exec(
        select(models.Region).where(models.Region.name.ilike(search_term)).limit(limit)
    ).all()
    results["regions"] = [r.dict() for r in regions]
    
    # Search districts
    districts = session.exec(
        select(models.District).where(models.District.name.ilike(search_term)).limit(limit)
    ).all()
    results["districts"] = [d.dict() for d in districts]
    
    # Search landmarks
    landmarks = session.exec(
        select(models.Landmark).where(
            (models.Landmark.code.ilike(search_term)) | 
            (models.Landmark.name.ilike(search_term))
        ).limit(limit)
    ).all()
    results["landmarks"] = [l.dict() for l in landmarks]
    
    # Search poles
    poles = session.exec(
        select(models.Pole).where(
            (models.Pole.code.ilike(search_term)) |
            (models.Pole.location_name.ilike(search_term))
        ).limit(limit)
    ).all()
    results["poles"] = [p.dict() for p in poles]
    
    # Search junction boxes
    jbs = session.exec(
        select(models.JunctionBox).where(
            models.JunctionBox.code.ilike(search_term)
        ).limit(limit)
    ).all()
    results["junction_boxes"] = [j.dict() for j in jbs]
    
    # Search components
    components = session.exec(
        select(models.Component).where(
            (models.Component.component_code.ilike(search_term)) |
            (models.Component.component_type.ilike(search_term)) |
            (models.Component.model.ilike(search_term)) |
            (models.Component.serial.ilike(search_term))
        ).limit(limit)
    ).all()
    results["components"] = [c.dict() for c in components]
    
    # Search credentials
    credentials = session.exec(
        select(models.Credential).where(
            (models.Credential.component_code.ilike(search_term)) |
            (models.Credential.ip_address.ilike(search_term)) |
            (models.Credential.username.ilike(search_term))
        ).limit(limit)
    ).all()
    results["credentials"] = [c.dict() for c in credentials]

    try:
        needle = q.lower()
        # Get ALL Excel rows with their workbook and sheet info
        all_excel_rows = session.exec(
            select(models.ExcelRow).order_by(models.ExcelRow.id.desc())
        ).all()
        
        hits = []
        hits_by_key = {}  # Track hits to deduplicate
        
        for r in all_excel_rows:
            if needle in json.dumps(r.data, ensure_ascii=False).lower():
                sh = session.get(models.ExcelSheet, r.sheet_id)
                wb = session.get(models.ExcelWorkbook, sh.workbook_id) if sh else None
                
                hit = {
                    "workbook_id": wb.id if wb else None,
                    "workbook": wb.filename if wb else None,
                    "sheet_id": sh.id if sh else None,
                    "sheet": sh.name if sh else None,
                    "row_id": r.id,
                    "row_index": r.row_index,
                    "data": r.data,
                }
                
                # Create a unique key to avoid duplicate rows
                hit_key = f"{hit['workbook_id']}_{hit['sheet_id']}_{hit['row_id']}"
                if hit_key not in hits_by_key:
                    hits.append(hit)
                    hits_by_key[hit_key] = True
                    
                if len(hits) >= 500:
                    break
        
        results["excel"] = hits
    except Exception as e:
        print(f"Excel search error: {e}")
        pass

    # Count total results
    total = sum(len(v) for v in results.values())
    
    return {
        "query": q,
        "total_results": total,
        "results": results,
    }


@search_router.get("/excel-by-value")
def search_excel_by_value(
    q: str = Query(..., min_length=1),
    session: Session = Depends(get_session),
):
    """
    Search for a specific value across all Excel workbooks and sheets.
    Returns all occurrences of the value with their full row data and workbook/sheet info.
    This includes ALL matching data even if some fields are empty.
    """
    needle = q.lower()
    results_by_workbook = {}
    
    # Get all Excel rows
    all_rows = session.exec(select(models.ExcelRow)).all()
    
    for row in all_rows:
        # Search in all cell values of the row
        if needle in json.dumps(row.data, ensure_ascii=False).lower():
            sh = session.get(models.ExcelSheet, row.sheet_id)
            wb = session.get(models.ExcelWorkbook, sh.workbook_id) if sh else None
            
            if wb:
                wb_key = f"{wb.id}_{wb.filename}"
                if wb_key not in results_by_workbook:
                    results_by_workbook[wb_key] = {
                        "workbook_id": wb.id,
                        "workbook": wb.filename,
                        "imported_at": wb.imported_at,
                        "sheets": {}
                    }
                
                sheet_key = f"{sh.id}_{sh.name}"
                if sheet_key not in results_by_workbook[wb_key]["sheets"]:
                    results_by_workbook[wb_key]["sheets"][sheet_key] = {
                        "sheet_id": sh.id,
                        "sheet": sh.name,
                        "columns": sh.columns or [],
                        "rows": []
                    }
                
                results_by_workbook[wb_key]["sheets"][sheet_key]["rows"].append({
                    "row_id": row.id,
                    "row_index": row.row_index,
                    "data": row.data,
                })
    
    # Convert to list format
    results = []
    for wb_data in results_by_workbook.values():
        sheets = []
        for sheet_data in wb_data["sheets"].values():
            sheets.append(sheet_data)
        wb_data["sheets"] = sheets
        results.append(wb_data)
    
    return {
        "query": q,
        "total_matches": sum(len(wb["sheets"]) for wb in results),
        "workbooks": results,
    }


