import csv
import io
import openpyxl
from tools.db_models import get_all_bugs

def export_bugs_to_csv() -> bytes:
    """Exports all bugs to a CSV byte string."""
    bugs = get_all_bugs()
    if not bugs:
        return b""
        
    output = io.StringIO()
    # Determine columns based on the first bug
    columns = [
        'bug_id', 'title', 'status', 'severity', 'priority', 
        'reporter_name', 'assignee_name', 'module', 'created_at'
    ]
    
    writer = csv.DictWriter(output, fieldnames=columns, extrasaction='ignore')
    writer.writeheader()
    for bug in bugs:
        writer.writerow(bug)
        
    return output.getvalue().encode('utf-8')


def export_bugs_to_excel() -> bytes:
    """Exports all bugs to an Excel (.xlsx) byte stream using openpyxl."""
    bugs = get_all_bugs()
    
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Bugs"
    
    columns = [
        'bug_id', 'title', 'status', 'severity', 'priority', 
        'reporter_name', 'assignee_name', 'module', 'created_at',
        'description', 'steps_to_reproduce'
    ]
    
    # Write header
    ws.append(columns)
    
    # Make header bold
    for cell in ws[1]:
        cell.font = openpyxl.styles.Font(bold=True)
        
    # Write data
    for bug in bugs:
        row = [bug.get(col, "") for col in columns]
        ws.append(row)
        
    # Auto-adjust column widths (simple approximation)
    for col in ws.columns:
        max_length = 0
        column_identifier = col[0].column_letter
        for cell in col:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(cell.value)
            except:
                pass
        adjusted_width = min(max_length + 2, 50) # Cap width
        ws.column_dimensions[column_identifier].width = adjusted_width
        
    # Save to bytes
    output = io.BytesIO()
    wb.save(output)
    return output.getvalue()
