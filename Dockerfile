FROM tiangolo/uvicorn-gunicorn:python3.9

RUN apt-get update

WORKDIR /code

COPY . /code


RUN pip install  -r /code/requirements.txt
RUN pip install "uvicorn[standard]" gunicorn
RUN pip3 install --upgrade pip


CMD gunicorn app.api:app --workers 1 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:80 --timeout 9999