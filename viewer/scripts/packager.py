import sys
import json
import os
import shutil
from pathlib import Path
import logging
import warnings
import base64
import argparse
import math

import openpyxl
from sparc.client import SparcClient
from urllib3.exceptions import InsecureRequestWarning

# Configuration
logging.getLogger("pennsieve").setLevel(logging.CRITICAL)
warnings.filterwarnings("ignore", category=InsecureRequestWarning)
warnings.filterwarnings("ignore", category=DeprecationWarning)

def send_message(status, message, value=None):
    """Sends a JSON message to stdout for the Electron app to read."""
    payload = {"status": status, "message": message}
    if value is not None:
        payload["value"] = value
    print(json.dumps(payload), flush=True)

def format_size(size_bytes):
    """Converts bytes to a human-readable string."""
    if not isinstance(size_bytes, (int, float)) or size_bytes <= 0:
        return "0B"
    size_name = ("B", "KB", "MB", "GB", "TB")
    i = int(math.floor(math.log(size_bytes, 1024)))
    p = math.pow(1024, i)
    s = round(size_bytes / p, 2)
    return f"{s} {size_name[i]}"

def build_file_tree(directory):
    """Recursively builds a nested dictionary representing a file/folder structure."""
    tree = []
    for item in sorted(os.listdir(directory)):
        path = Path(directory) / item
        node = {"name": item}
        if path.is_file():
            node["type"] = "file"
            node["size"] = path.stat().st_size
        elif path.is_dir():
            node["type"] = "folder"
            node["children"] = build_file_tree(path)
        tree.append(node)
    return tree

def browse_datasets(query, page, limit):
    """Searches for datasets and returns a JSON list."""
    try:
        client = SparcClient(connect=False)
        offset = (page - 1) * limit
        # The list_datasets method returns a dictionary, the datasets are in the 'datasets' key
        results = client.pennsieve.list_datasets(query=query, limit=limit, offset=offset)
        print(json.dumps(results), flush=True)
    except Exception as e:
        print(json.dumps({"error": str(e)}), flush=True)
        sys.exit(1)

def package_dataset(dataset_id, output_dir):
    """Downloads the latest version of a SPARC dataset and packages it."""
    client = SparcClient(connect=False)
    
    temp_dir = Path(output_dir) / f"temp_{dataset_id}"
    
    if temp_dir.exists():
        shutil.rmtree(temp_dir)
    temp_dir.mkdir(parents=True, exist_ok=True)

    try:
        send_message("progress", "Fetching file list (Latest)...")
        files_to_download = client.pennsieve.list_files(dataset_id=dataset_id, limit=10000)
        
        if not files_to_download:
            send_message("error", f"No files found for dataset {dataset_id}.")
            return

        total_size = sum(f.get('size', 0) or 0 for f in files_to_download)
        formatted_size = format_size(total_size)
        
        send_message(
            "confirm_download", 
            f"Total dataset size is {formatted_size}. Proceed with download?",
            {"totalSize": total_size, "formattedSize": formatted_size, "fileCount": len(files_to_download)}
        )
        
        confirmation = sys.stdin.readline().strip()
        
        if confirmation != 'confirm':
            send_message("idle", "Download cancelled by user.")
            return

        total_files = len(files_to_download)
        original_cwd = os.getcwd()
        os.chdir(temp_dir)
        
        try:
            for i, file_info in enumerate(files_to_download):
                progress_percent = (i + 1) / total_files
                send_message("progress", f"Downloading file {i+1} of {total_files}", {"progress": progress_percent})
                client.pennsieve.download_file(file_info)
        finally:
            os.chdir(original_cwd)

        send_message("progress", "Generating manifest...", {"progress": None})
        manifest = { 
            "dataset_id": str(dataset_id), 
            "dataset_title": "N/A", 
            "authors": "N/A",
            "thumbnail": None 
        }
        desc_path = temp_dir / 'dataset_description.xlsx'
        if desc_path.exists():
            try:
                wb = openpyxl.load_workbook(desc_path)
                sheet = wb.active
                metadata = {str(row[0].value).strip(): row[1].value for row in sheet.iter_rows(min_row=1) if row[0] and row[0].value}
                manifest['dataset_title'] = metadata.get('Title', 'N/A')
                author_string = metadata.get('Contributors', metadata.get('Authors', metadata.get('Author', 'N/A')))
                manifest['authors'] = str(author_string) if author_string else "N/A"
            except Exception:
                pass
        
        thumbnail_path = next((p for p in [temp_dir / 'thumbnail.jpg', temp_dir / 'thumbnail.png'] if p.exists()), None)
        if thumbnail_path:
            with open(thumbnail_path, "rb") as image_file:
                mime_type = "image/jpeg" if thumbnail_path.suffix == ".jpg" else "image/png"
                manifest['thumbnail'] = f"data:{mime_type};base64,{base64.b64encode(image_file.read()).decode('utf-8')}"

        manifest['file_tree'] = build_file_tree(temp_dir)
        with open(temp_dir / 'viewer_manifest.json', 'w') as f:
            json.dump(manifest, f, indent=2)
        
        send_message("progress", "Archiving files...", {"progress": None})
        archive_path = Path(output_dir) / f"{dataset_id}"
        shutil.make_archive(str(archive_path), 'zip', temp_dir)
        
        # The line below has been changed to use the .sparchive extension
        final_archive_path = Path(output_dir) / f"{dataset_id}.sparchive"
        if final_archive_path.exists():
            os.remove(final_archive_path)
        shutil.move(f"{archive_path}.zip", final_archive_path)

        send_message("done", "Packaging complete!", {"path": str(final_archive_path), "manifest": manifest})

    except Exception as e:
        send_message("error", str(e))
    finally:
        if temp_dir.exists():
            shutil.rmtree(temp_dir)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="spARCHIVE backend script for browsing and packaging SPARC datasets.")
    subparsers = parser.add_subparsers(dest='command', required=True, help='Available commands')

    # --- Browse Command ---
    browse_parser = subparsers.add_parser('browse', help='Browse for datasets.')
    browse_parser.add_argument('--query', type=str, required=True, help='The search term for datasets.')
    browse_parser.add_argument('--page', type=int, default=1, help='The page number for pagination.')
    browse_parser.add_argument('--limit', type=int, default=5, help='Number of results per page.')

    # --- Package Command ---
    package_parser = subparsers.add_parser('package', help='Package a single dataset by its ID.')
    package_parser.add_argument('dataset_id', type=str, help='The ID of the dataset to package.')
    package_parser.add_argument('output_dir', type=str, help='The directory to save the packaged file.')
    
    args = parser.parse_args()

    if args.command == 'browse':
        browse_datasets(args.query, args.page, args.limit)
    elif args.command == 'package':
        package_dataset(args.dataset_id, args.output_dir)
