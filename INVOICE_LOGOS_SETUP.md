# Invoice Logos Setup Instructions

## 📁 Folder Structure

To display the certification logos in your invoices, you need to create the following folder structure in your project:

```
servigence/
└── public/
    └── logosPNG/
        ├── iata.png
        ├── dtcm.png
        ├── asta.png
        ├── tafi.png
        ├── adta.png
        ├── atol.png
        ├── iata2.png (if you have a second IATA logo)
        └── gcc.png
```

## 🔧 Setup Steps

### Step 1: Create the Public Folder (if it doesn't exist)
1. In your project root (`c:\Users\PC\Desktop\servigence`), create a folder named `public` if it doesn't already exist
2. Inside the `public` folder, create a folder named `logosPNG`

### Step 2: Add Your Logo Images
1. Copy all your certification logo PNG files from `src/imagess/logosPNG` to `public/logosPNG`
2. Make sure the file names match exactly:
   - `iata.png` - IATA logo
   - `dtcm.png` - DTCM logo
   - `asta.png` - ASTA logo
   - `tafi.png` - TAFI logo
   - `adta.png` - ADTA logo
   - `atol.png` - ATOL logo
   - `iata2.png` - Second IATA logo (if different)
   - `gcc.png` - GCC logo

### Step 3: Verify the Setup
1. After placing the logos, the invoice will automatically load them
2. If a logo file is missing or fails to load, a placeholder with the logo name will be shown instead

## 📝 Notes

- **File Format**: Use PNG format for best quality and transparency support
- **File Size**: Recommended size is 60x60 pixels or larger (will be scaled to fit)
- **File Names**: Must be lowercase and match exactly as shown above
- **Location**: Must be in `public/logosPNG/` folder (not `src/imagess/`)

## 🎨 Logo Display

The logos will appear in the invoice in this order:
1. IATA
2. DTCM
3. ASTA
4. TAFI
5. ADTA
6. ATOL
7. IATA (second logo)
8. GCC

## 🔄 Fallback Behavior

If any logo image fails to load:
- The invoice will show a placeholder box with the logo name
- The invoice will still print/display correctly
- No errors will be shown to the user

## ✅ Quick Command to Create Folder

Run this command in PowerShell from your project root:

```powershell
New-Item -ItemType Directory -Path "public\logosPNG" -Force
```

Then copy your logo files:

```powershell
Copy-Item "src\imagess\logosPNG\*" -Destination "public\logosPNG\" -Recurse
```

## 🚀 After Setup

Once you've placed the logos:
1. Refresh your application
2. Generate an invoice
3. The logos should appear in the certifications section
4. Test printing to ensure logos appear in the PDF

---

**Need Help?**
If logos don't appear, check:
- File names are exactly as specified (case-sensitive on some systems)
- Files are in `public/logosPNG/` not `src/imagess/logosPNG/`
- PNG files are valid and not corrupted
- Browser console for any 404 errors

