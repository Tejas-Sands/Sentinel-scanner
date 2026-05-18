import asyncio
import asyncpg
import socket

async def main():
    host = "db.borxzifvegkghshcrvde.supabase.co"
    port = 5432
    print(f"1. Testing DNS resolution for {host}...")
    try:
        ip = socket.gethostbyname(host)
        print(f"✅ DNS Resolved successfully! IP is: {ip}")
    except Exception as e:
        print(f"❌ DNS Resolution failed: {e}")
        return

    print(f"\n2. Testing raw TCP socket connection on Port {port}...")
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(5.0)
        s.connect((host, port))
        print(f"✅ Raw TCP connection succeeded on Port {port}!")
        s.close()
    except Exception as e:
        print(f"❌ Raw TCP connection failed: {e}")
        print("This confirms your local router/firewall is blocking outbound Port 5432.")
        return

    print("\n3. Testing PostgreSQL client connection with password encoding...")
    raw_url = "postgresql://postgres:KinderBitch511!@db.borxzifvegkghshcrvde.supabase.co:5432/postgres"
    encoded_url = "postgresql://postgres:KinderBitch511%21@db.borxzifvegkghshcrvde.supabase.co:5432/postgres"
    
    for name, url in [("Raw URL", raw_url), ("Encoded URL", encoded_url)]:
        print(f"Trying {name}...")
        try:
            conn = await asyncpg.connect(url, timeout=5.0, statement_cache_size=0)
            print(f"✅ Success! Connected using {name}!")
            await conn.close()
            return
        except Exception as e:
            print(f"❌ Failed with {name}: {e}")

if __name__ == "__main__":
    asyncio.run(main())
