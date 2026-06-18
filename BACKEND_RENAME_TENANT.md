# Backend Changes Required for Tenant Rename Feature

## Overview
This document describes the backend changes needed to allow renaming a tenant. ONLY the name should be editable - billing-relevant fields like annual_rent and move_in_date must remain immutable.

## API Endpoint Changes

### 1. Add PATCH /api/tenants/{tenant_id}
Create a new endpoint in `app/routers/tenants.py`:

```python
from app.dependencies import get_current_user
from app.models import User

@router.patch("/{tenant_id}", response_model=TenantResponse)
async def update_tenant_name(
    tenant_id: str,
    update_data: TenantNameUpdate,
    db: Session = Depends(get_database),
    current_user: User = Depends(get_current_user)
):
    """
    Update ONLY the name of a tenant
    Only admin and rent_collector roles are allowed
    """
    # Check permissions - only admin and rent_collector
    if current_user.role not in ["admin", "rent_collector"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin and rent_collector can rename tenants"
        )

    # Find tenant
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )

    # Update ONLY the name
    tenant.name = update_data.name
    tenant.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(tenant)

    return tenant
```

### 2. Add Pydantic Schema for Name Update
In `app/schemas.py`, add a new schema that ONLY accepts the name:

```python
class TenantNameUpdate(BaseModel):
    """
    Schema for updating ONLY the tenant name
    No other fields are allowed
    """
    name: str = Field(..., min_length=1, max_length=255)

    class Config:
        schema_extra = {
            "example": {
                "name": "Updated Tenant Name"
            }
        }
```

### 3. Keep Existing PUT Endpoint (If It Exists)
If a PUT `/api/tenants/{tenant_id}` endpoint exists for full updates:
- **Option A (Recommended):** Restrict it to admin-only
- **Option B:** Remove it entirely if not needed
- **Option C:** Keep it but add validation to prevent changing annual_rent and move_in_date

**Recommended approach for existing PUT endpoint:**
```python
@router.put("/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    tenant_id: str,
    update_data: TenantUpdate,
    db: Session = Depends(get_database),
    current_user: User = Depends(get_current_user)
):
    """
    DEPRECATED or ADMIN-ONLY
    For changing the name, use PATCH /api/tenants/{tenant_id}
    """
    # Restrict to admin only
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can use full update"
        )

    # ... existing implementation
```

## Security & Validation

### 4. Permission Check
- **PATCH /api/tenants/{tenant_id}** - Allowed for: `admin`, `rent_collector`
- **Blocked for**: `spectator`

### 5. Validation Rules
```python
class TenantNameUpdate(BaseModel):
    name: str = Field(
        ...,
        min_length=1,          # Must not be empty
        max_length=255,        # Reasonable limit
        strip_whitespace=True  # Remove leading/trailing spaces
    )

    @validator('name')
    def name_must_not_be_empty(cls, v):
        if not v or v.isspace():
            raise ValueError('Name cannot be empty or whitespace')
        return v
```

## Testing

### Test 1: Rename as Admin
```bash
curl -X PATCH https://api.takamul-cars.com/api/tenants/{tenant_id} \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Tenant Name"}'
```

**Expected:** 200 OK, returns updated tenant with new name

### Test 2: Rename as Rent Collector
```bash
curl -X PATCH https://api.takamul-cars.com/api/tenants/{tenant_id} \
  -H "Authorization: Bearer {rent_collector_token}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Another New Name"}'
```

**Expected:** 200 OK, returns updated tenant

### Test 3: Rename as Spectator (Should Fail)
```bash
curl -X PATCH https://api.takamul-cars.com/api/tenants/{tenant_id} \
  -H "Authorization: Bearer {spectator_token}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Should Not Work"}'
```

**Expected:** 403 Forbidden

### Test 4: Empty Name (Should Fail)
```bash
curl -X PATCH https://api.takamul-cars.com/api/tenants/{tenant_id} \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{"name": ""}'
```

**Expected:** 422 Unprocessable Entity (validation error)

### Test 5: Verify Other Fields Are NOT Changed
```bash
# Before rename
curl -X GET https://api.takamul-cars.com/api/tenants/{tenant_id} \
  -H "Authorization: Bearer {token}"
# Note the annual_rent and move_in_date values

# Rename
curl -X PATCH https://api.takamul-cars.com/api/tenants/{tenant_id} \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Renamed Tenant"}'

# After rename - verify annual_rent and move_in_date are UNCHANGED
curl -X GET https://api.takamul-cars.com/api/tenants/{tenant_id} \
  -H "Authorization: Bearer {token}"
```

## Important Design Decisions

### Why PATCH Instead of PUT?
- **PATCH** semantically means "partial update" - perfect for updating just the name
- **PUT** typically means "replace entire resource" - not appropriate here

### Why Only Name is Editable?
- **Name** is just a label - it doesn't affect billing calculations
- **annual_rent** and **move_in_date** are billing-relevant - changing them would corrupt historical data
- If rent changes in real life, the proper workflow is:
  1. Terminate the current tenant
  2. Create a new tenant entry with the new rent amount

### Why Allow rent_collector?
- Rent collectors need to fix typos in tenant names
- They don't have access to sensitive operations (delete, manage users)
- This is a low-risk operation

## Frontend Changes (Already Implemented)

The frontend will:
- Show a pencil icon next to the tenant name in TenantDetailScreen
- Open a modal with a text input when clicked
- Call **PATCH /api/tenants/{id}** with `{"name": "New Name"}`
- Refresh the screen to show the updated name
- Show success/error messages

## Deployment Checklist

- [ ] Add `TenantNameUpdate` schema to `app/schemas.py`
- [ ] Add PATCH `/api/tenants/{tenant_id}` endpoint to `app/routers/tenants.py`
- [ ] Add permission check (admin, rent_collector only)
- [ ] Test all scenarios (admin, rent_collector, spectator, empty name, verify other fields unchanged)
- [ ] Update API documentation (Swagger/OpenAPI)
- [ ] Deploy to production
- [ ] Verify frontend can successfully rename tenants
