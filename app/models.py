from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import Column
from sqlalchemy.dialects.sqlite import JSON as SQLITE_JSON
from sqlmodel import Field, Relationship, SQLModel


class Region(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)

    districts: List["District"] = Relationship(back_populates="region")
    components: List["Component"] = Relationship(back_populates="region")


class District(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    region_id: int = Field(foreign_key="region.id")

    region: Region = Relationship(back_populates="districts")
    landmarks: List["Landmark"] = Relationship(back_populates="district")
    poles: List["Pole"] = Relationship(back_populates="district")
    junction_boxes: List["JunctionBox"] = Relationship(back_populates="district")
    components: List["Component"] = Relationship(back_populates="district")

class Landmark(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(index=True, unique=True)
    name: Optional[str] = Field(default=None)
    lat: Optional[float] = None
    lng: Optional[float] = None
    district_id: int = Field(foreign_key="district.id")
    region_id: int = Field(foreign_key="region.id")

    district: District = Relationship(back_populates="landmarks")
    region: Region = Relationship()
    poles: List["Pole"] = Relationship(back_populates="landmark")
    junction_boxes: List["JunctionBox"] = Relationship(back_populates="landmark")
    components: List["Component"] = Relationship(back_populates="landmark")


class Pole(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(index=True, unique=True)
    location_name: Optional[str] = Field(default=None)
    lat: Optional[float] = None
    lng: Optional[float] = None
    landmark_id: int = Field(foreign_key="landmark.id")
    district_id: int = Field(foreign_key="district.id")
    region_id: int = Field(foreign_key="region.id")

    landmark: Landmark = Relationship(back_populates="poles")
    district: District = Relationship(back_populates="poles")
    region: Region = Relationship()
    junction_boxes: List["JunctionBox"] = Relationship(back_populates="pole")
    components: List["Component"] = Relationship(back_populates="pole")


class JunctionBox(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(index=True, unique=True)
    lat: Optional[float] = None
    lng: Optional[float] = None
    pole_id: int = Field(foreign_key="pole.id")
    landmark_id: int = Field(foreign_key="landmark.id")
    district_id: int = Field(foreign_key="district.id")
    region_id: int = Field(foreign_key="region.id")

    pole: Pole = Relationship(back_populates="junction_boxes")
    landmark: Landmark = Relationship(back_populates="junction_boxes")
    district: District = Relationship(back_populates="junction_boxes")
    region: Region = Relationship()
    components: List["Component"] = Relationship(back_populates="junction_box")


class Component(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    component_code: str = Field(index=True, unique=True)
    component_type: str = Field(index=True)
    connected_to_code: Optional[str] = Field(default=None, index=True)
    model: Optional[str] = None
    serial: Optional[str] = None
    firmware: Optional[str] = None
    os: Optional[str] = None
    licenses: Optional[str] = None
    pole_id: Optional[int] = Field(default=None, foreign_key="pole.id")
    jb_id: Optional[int] = Field(default=None, foreign_key="junctionbox.id")
    landmark_id: Optional[int] = Field(default=None, foreign_key="landmark.id")
    district_id: Optional[int] = Field(default=None, foreign_key="district.id")
    region_id: Optional[int] = Field(default=None, foreign_key="region.id")
    project_phase: Optional[float] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    landmark_name: Optional[str] = None
    frs_camera: Optional[str] = None
    power_req: Optional[str] = None
    local_if_name: Optional[str] = None
    local_if_ip: Optional[str] = None
    remote_if_name: Optional[str] = None
    remote_if_ip: Optional[str] = None
    cable_id: Optional[str] = None
    physical_link_type: Optional[str] = None
    logical_link_type: Optional[str] = None
    segment_type: Optional[str] = None
    segment_switches: Optional[str] = None
    segment_junctions: Optional[str] = None
    segment_instance_no: Optional[str] = None
    fiber_core_usage: Optional[str] = None
    proposed_vlan: Optional[str] = None
    proposed_subnet: Optional[str] = None
    ip_assignment: Optional[str] = None
    video_priority: Optional[str] = None
    security_zone: Optional[str] = None
    last_config_change: Optional[str] = None
    last_config_backup: Optional[str] = None
    maintenance_schedule: Optional[str] = None
    last_maintenance: Optional[str] = None
    monitoring_tool: Optional[str] = None
    network_provider: Optional[str] = None
    static_router_ip: Optional[str] = None
    landline_number: Optional[str] = None
    termination_type: Optional[str] = None
    router1: Optional[str] = None
    router2: Optional[str] = None
    http_port: Optional[str] = None
    rtsp_port: Optional[str] = None

    pole: Optional[Pole] = Relationship(back_populates="components")
    junction_box: Optional[JunctionBox] = Relationship(back_populates="components")
    landmark: Optional[Landmark] = Relationship(back_populates="components")
    district: Optional[District] = Relationship(back_populates="components")
    region: Optional[Region] = Relationship(back_populates="components")
    credentials: Optional["Credential"] = Relationship(back_populates="component")


class Credential(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    component_id: Optional[int] = Field(default=None, foreign_key="component.id", index=True)
    component_code: Optional[str] = Field(default=None, index=True)
    username: Optional[str] = None
    password: Optional[str] = None
    ip_address: Optional[str] = None
    port: Optional[str] = None
    access_type: Optional[str] = None  # SSH, HTTP, HTTPS, etc.
    notes: Optional[str] = None
    last_updated: Optional[str] = None

    component: Optional[Component] = Relationship(back_populates="credentials")


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    email: Optional[str] = None
    hashed_password: str
    is_active: bool = Field(default=True)


class AuditLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True)
    action: str = Field(index=True)  # CREATE, READ, UPDATE, DELETE, SEARCH
    entity_type: str = Field(index=True)  # regions, districts, components, etc.
    entity_id: Optional[int] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    description: Optional[str] = None
    timestamp: str = Field(index=True)  # ISO format timestamp
    ip_address: Optional[str] = None

class ExcelWorkbook(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    filename: str = Field(index=True)
    sha256: Optional[str] = Field(default=None, index=True)
    imported_at: str = Field(index=True)  # ISO timestamp

    sheets: List["ExcelSheet"] = Relationship(back_populates="workbook")


class ExcelSheet(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    workbook_id: int = Field(foreign_key="excelworkbook.id", index=True)
    name: str = Field(index=True)

   # Excel-like metadata
    header_row: Optional[int] = None  # 1-based row number if detected
    max_row: Optional[int] = None
    max_col: Optional[int] = None
    columns: List[str] = Field(default_factory=list, sa_column=Column(SQLITE_JSON))

    workbook: "ExcelWorkbook" = Relationship(back_populates="sheets")
    rows: List["ExcelRow"] = Relationship(back_populates="sheet")


class ExcelRow(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    sheet_id: int = Field(foreign_key="excelsheet.id", index=True)
    row_index: int = Field(index=True)  # 1-based row index in the original sheet

    # column_key -> value (keys are detected headers if possible, else A/B/C...)
    data: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(SQLITE_JSON))

    sheet: "ExcelSheet" = Relationship(back_populates="rows")
