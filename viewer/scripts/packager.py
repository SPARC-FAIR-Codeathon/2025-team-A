import sys
import json
import os
import shutil
from pathlib import Path
import logging
import warnings
import base64
import argparse

import openpyxl
from sparc.client import SparcClient
from urllib3.exceptions import InsecureRequestWarning

# Configuration
logging.getLogger("pennsieve").setLevel(logging.CRITICAL)
warnings.filterwarnings("ignore", category=InsecureRequestWarning)

def send_message(status, message, value=None):
    """Sends a JSON message to stdout for the Electron app to read."""
    payload = {"status": status, "message": message}
    if value is not None:
        payload["value"] = value
    print(json.dumps(payload), flush=True)

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

def package_dataset(dataset_id, output_dir):
    """Downloads a SPARC dataset and packages it into a .sparc file."""
    client = SparcClient(connect=False)
    
    temp_dir = Path(output_dir) / f"temp_{dataset_id}"
    
    if temp_dir.exists():
        shutil.rmtree(temp_dir)
    temp_dir.mkdir(parents=True, exist_ok=True)

    try:
        send_message("progress", "Fetching file list...")
        files_to_download = client.pennsieve.list_files(dataset_id=dataset_id)
        
        if not files_to_download:
            send_message("error", f"No files found for dataset {dataset_id}.")
            return

        total_files = len(files_to_download)
        original_cwd = os.getcwd()
        os.chdir(temp_dir)
        
        try:
            for i, file_info in enumerate(files_to_download):
                send_message("progress", f"Downloading file {i+1} of {total_files}", (i + 1) / total_files)
                client.pennsieve.download_file(file_info)
        finally:
            os.chdir(original_cwd)

        send_message("progress", "Generating manifest...")
        manifest = { "dataset_id": str(dataset_id), "dataset_title": "N/A", "thumbnail": None }
        desc_path = temp_dir / 'dataset_description.xlsx'
        if desc_path.exists():
            try:
                wb = openpyxl.load_workbook(desc_path)
                sheet = wb.active
                metadata = {row[0].value: row[1].value for row in sheet.iter_rows(min_row=1) if row[0] and row[0].value}
                manifest['dataset_title'] = metadata.get('Title', 'N/A')
            except Exception: pass
        
        thumbnail_path = next((p for p in [temp_dir / 'thumbnail.jpg', temp_dir / 'thumbnail.png'] if p.exists()), None)
        if thumbnail_path:
            with open(thumbnail_path, "rb") as image_file:
                mime_type = "image/jpeg" if thumbnail_path.suffix == ".jpg" else "image/png"
                manifest['thumbnail'] = f"data:{mime_type};base64,{base64.b64encode(image_file.read()).decode('utf-8')}"

        manifest['file_tree'] = build_file_tree(temp_dir)
        with open(temp_dir / 'viewer_manifest.json', 'w') as f:
            json.dump(manifest, f, indent=2)
        
        send_message("progress", "Archiving files...")
        archive_path = Path(output_dir) / f"{dataset_id}"
        shutil.make_archive(str(archive_path), 'zip', temp_dir)
        
        final_archive_path = Path(output_dir) / f"{dataset_id}.sparc"
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
    parser = argparse.ArgumentParser()
    parser.add_argument("dataset_id", type=int)
    parser.add_argument("output_dir", type=str)
    args = parser.parse_args()
    package_dataset(args.dataset_id, args.output_dir)
